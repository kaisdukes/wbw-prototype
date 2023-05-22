import { NavigationContainer } from '../navigation/navigation-container';
import { NavigationHeader } from '../navigation/navigation-header';
import { WordByWordView } from './word-by-word-view';
import { ChapterService } from '../corpus/orthography/chapter-service';
import { formatChapterTitle } from '../corpus/orthography/chapter';
import { container } from 'tsyringe';
import './word-by-word.scss';

type Props = {
    chapterNumber: number
}

export const WordByWord = ({ chapterNumber }: Props) => {
    const chapterService = container.resolve(ChapterService);
    const chapter = chapterService.getChapter(chapterNumber);

    return (
        <NavigationContainer header={<NavigationHeader chapterNumber={chapterNumber} />}>
            <h1 className='chapter-title'>{chapterNumber}. {formatChapterTitle(chapter)}</h1>
            {
                <WordByWordView chapterNumber={chapterNumber} />
            }
        </NavigationContainer>
    )
}