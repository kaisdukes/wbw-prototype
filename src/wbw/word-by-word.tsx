import { useEffect, useRef, useState } from 'react';
import { LoaderFunctionArgs, useLoaderData } from 'react-router-dom';
import { NavigationContainer } from '../navigation/navigation-container';
import { NavigationHeader } from '../navigation/navigation-header';
import { ChapterService } from '../corpus/orthography/chapter-service';
import { MorphologyService } from '../corpus/morphology/morphology-service';
import { Verse } from '../corpus/orthography/verse';
import { Location } from '../corpus/location';
import { Footer } from '../components/footer';
import { container } from 'tsyringe';
import { ReactComponent as Bismillah } from '../images/bismillah.svg';
import { ReaderView } from './reader-view';
import { DetailView } from './detail-view';
import { useSettings } from '../settings/settings-context';
import { ChapterHeader } from './chapter-header';
import { CorpusError } from '../errors/corpus-error';
import { formatLocationWithBrackets, parseLocation } from '../corpus/location';
import { LoadingBanner } from '../components/loading-banner';
import { Token } from '../corpus/orthography/token';
import { getVerseId } from './verse-id';
import './word-by-word.scss';

export const resolveLocation = ({ params }: LoaderFunctionArgs) => {
    const location = parseLocation(params.location!);
    if (isNaN(location[0])) {
        throw new CorpusError('404', 'Page not found');
    }
    return location.length === 1 ? [location[0], 1] : location;
}

const buildMorphologyQuery = (up: boolean, urlVerseNumber: number, verses: Verse[]) => {
    let verseCount = 10;
    let start: number;
    if (verses.length === 0) {
        start = urlVerseNumber;
    } else if (up) {
        const first = verses[0].location[1];
        start = Math.max(1, first - verseCount);
        if (start < first) {
            verseCount = first - start;
        }
    } else {
        start = verses[verses.length - 1].location[1] + 1;
    }
    return { start, verseCount };
}

const intersectionOptions = {
    rootMargin: '0px',
    threshold: 0.1
}

type ScrollTarget = {
    verseNumber: number
}

export const WordByWord = () => {
    const location = useLoaderData() as Location;
    const [chapterNumber, verseNumber] = location;
    const chapterService = container.resolve(ChapterService);
    const chapter = chapterService.getChapter(chapterNumber);
    const [verses, setVerses] = useState<Verse[]>([]);
    const [scrollTarget, setScrollTarget] = useState<ScrollTarget>();
    const loadingRefTop = useRef<HTMLDivElement>(null);
    const loadingRefBottom = useRef<HTMLDivElement>(null);
    const isLoadingRef = useRef<boolean>(false);
    const [loadingTop, setLoadingTop] = useState(false);
    const [loadingBottom, setLoadingBottom] = useState(false);
    const [startComplete, setStartComplete] = useState(false);
    const [endComplete, setEndComplete] = useState(false);
    const morphologyService = container.resolve(MorphologyService);
    const { settings } = useSettings();
    const { readerMode, translations } = settings;
    const [isScrollingUp, setIsScrollingUp] = useState(false);

    const loadVerses = async (up: boolean, verses: Verse[]) => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;

        console.log(`Loading verses: direction = ${up ? 'up' : 'down'}`);
        if (up) {
            setLoadingTop(true);
        } else {
            setLoadingBottom(true);
        }

        const { start, verseCount } = buildMorphologyQuery(up, verseNumber, verses);
        console.log(`    loading verse ${chapterNumber}:${start} (n = ${verseCount})`);
        const loadedVerses = await morphologyService.getMorphology([chapterNumber, start], verseCount, translations);
        const newVerses = up ? [...loadedVerses, ...verses] : [...verses, ...loadedVerses];
        setVerses(newVerses);
        setScrollTarget(
            up
                ? verses.length > 0 ? { verseNumber: verses[0].location[1] - 1 } : undefined
                : undefined
        );

        if (newVerses[0].location[1] === 1) {
            if (!startComplete) console.log('    start complete');
            setStartComplete(true);
        }

        if (newVerses[newVerses.length - 1].location[1] === chapter.verseCount) {
            if (!endComplete) console.log('    end complete');
            setEndComplete(true);
        }

        isLoadingRef.current = false;
        if (up) {
            setLoadingTop(false);
        } else {
            setLoadingBottom(false);
        }
        console.log('    done');
    };

    useEffect(() => {
        setVerses([]);
        setStartComplete(false);
        setEndComplete(false);
        loadVerses(false, []); // avoid stale state
    }, [chapterNumber, verseNumber]);

    useEffect(() => {
        if (!scrollTarget) return;
        const { verseNumber } = scrollTarget;
        let targetElement = verseNumber === 1
            ? loadingRefTop.current
            : document.querySelector(`#${getVerseId([chapterNumber, verseNumber])}`);
        if (targetElement) {
            console.log(`Scrolling to verse ${verseNumber}`)
            targetElement.scrollIntoView();

            const bodyTop = document.body.getBoundingClientRect().top;
            const elementTop = targetElement.getBoundingClientRect().top;
            window.scrollTo({
                top: elementTop - bodyTop - 50,
                behavior: 'smooth'
            });
        }
    }, [verses, scrollTarget]);

    useEffect(() => {
        const observerTop = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !isLoadingRef.current && !startComplete && isScrollingUp) {
                loadVerses(true, verses);
            }
        }, intersectionOptions);

        const observerBottom = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !isLoadingRef.current && !endComplete) {
                loadVerses(false, verses);
            }
        }, intersectionOptions);

        if (loadingRefTop.current) {
            observerTop.observe(loadingRefTop.current);
        }

        if (loadingRefBottom.current) {
            observerBottom.observe(loadingRefBottom.current);
        }

        return () => {
            if (loadingRefTop.current) {
                observerTop.unobserve(loadingRefTop.current);
            }
            if (loadingRefBottom.current) {
                observerBottom.unobserve(loadingRefBottom.current);
            }
        };
    }, [verses, loadingTop, loadingBottom, startComplete, endComplete, isScrollingUp]);

    useEffect(() => {
        const handleWheelScroll = (event: WheelEvent) => {
            setIsScrollingUp(event.deltaY < 0);
        };

        const handleTouchScroll = (event: TouchEvent) => {
            setIsScrollingUp(event.touches[0].clientY > event.touches[event.touches.length - 1].clientY);
        };

        window.addEventListener('wheel', handleWheelScroll);
        window.addEventListener('touchmove', handleTouchScroll);

        return () => {
            window.removeEventListener('wheel', handleWheelScroll);
            window.removeEventListener('touchmove', handleTouchScroll);
        };
    }, []);

    const handleTokenClick = (token: Token) => {
        const root = token.root;
        if (!root) return;
        const location = formatLocationWithBrackets(token.location);
        const url = `https://corpus.quran.com/qurandictionary.jsp?q=${root}#${location}`;
        window.open(url, '_blank');
    }

    return (
        <NavigationContainer header={<NavigationHeader chapterNumber={chapterNumber} />}>
            <div className='word-by-word'>
                {loadingTop && <LoadingBanner />}
                <div ref={loadingRefTop} />
                <div className='word-by-word-view'>
                    {
                        verses.length > 0 && verses[0].location[1] === 1 &&
                        <>
                            <ChapterHeader chapter={chapter} />
                            <Bismillah className='bismillah' />
                        </>
                    }
                    {
                        readerMode
                            ? <ReaderView verses={verses} onClickToken={handleTokenClick} />
                            : <DetailView verses={verses} onClickToken={handleTokenClick} />
                    }
                </div>
                {loadingBottom && <LoadingBanner />}
                <div ref={loadingRefBottom} />
                <Footer />
            </div>
        </NavigationContainer>
    )
}