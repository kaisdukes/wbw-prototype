import { IconButton } from '../components/icon-button';
import { Token } from '../corpus/orthography/token';
import { Verse } from '../corpus/orthography/verse';
import { VerseToken } from './verse-token';
import { SectionMark } from '../components/section-mark';
import { SajdahMark } from '../components/sajdah-mark';
import { EndOfVerse } from '../components/end-of-verse';
import { ClipboardService } from '../clipboard/clipboard-service';
import { useSettings } from '../settings/settings-context';
import { getVerseId } from './verse-id';
import { container } from 'tsyringe';
import copy from '../images/icons/copy.svg';
import './verse-element.scss';

type Props = {
    verse: Verse,
    onClickToken: (token: Token) => void
}

export const VerseElement = ({ verse, onClickToken }: Props) => {
    const { location, tokens, translations, verseMark } = verse;
    const { settings } = useSettings();

    const handleCopy = async () => {
        const clipboardService = container.resolve(ClipboardService);
        await clipboardService.copyVerse(verse);
    }

    return (
        <div id={getVerseId(location)} className='verse-element'>
            <div className='verse-header'>
                <span className='verse-number'>{location[1]}</span>
                <IconButton className='copy-button' icon={copy} onClick={handleCopy} />
            </div>
            <div className='verse-tokens'>
                {verseMark === 'section' && <SectionMark />}
                {
                    tokens.map((token, i) => (
                        <VerseToken
                            key={`token-${i}`}
                            token={token}
                            onClick={() => onClickToken(token)} />
                    ))
                }
                {verseMark === 'sajdah' && <SajdahMark />}
                <EndOfVerse verseNumber={location[1]} />
            </div>
            {
                translations &&
                <div className='verse-translation'>
                    {
                        translations.map((translation, index) => {
                            return (
                                <div key={`translation-${index}`}>
                                    <div>
                                        {
                                            translations.length !== 1 &&
                                            <>
                                                <strong>{translation.name}</strong>:
                                                {' '}
                                            </>
                                        }
                                        {translation.translation}
                                    </div>
                                </div>
                            )
                        })
                    }
                </div>
            }
        </div>
    )
}