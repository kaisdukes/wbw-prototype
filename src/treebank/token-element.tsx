import { useMemo } from 'react';
import { Token } from '../corpus/orthography/token';
import { TokenHeader } from './token-header';
import { ArabicTextService } from '../arabic/arabic-text-service';
import { ColorService } from '../theme/color-service';
import { container } from 'tsyringe';
import './token-element.scss';

type Props = {
    token: Token
}

export const TokenElement = ({ token }: Props) => {

    const arabicTextService = container.resolve(ArabicTextService);
    const colorService = container.resolve(ColorService);

    const { segments } = token;

    const joinedSegments = useMemo(() => {
        const joinedSegments = segments.map(segment => segment.text);
        arabicTextService.insertZeroWidthJoinersForSafari(joinedSegments);
        return joinedSegments;
    }, [segments]);

    return (
        <div className='token-element'>
            <div className='token-content'>
                <TokenHeader token={token} />
                <div className='segment-container'>
                    {
                        segments.map((segment, i) => (
                            <span
                                key={`segment-${i}`}
                                className={`segment ${colorService.getSegmentColor(segment)}`}
                                dangerouslySetInnerHTML={{ __html: joinedSegments[i] }} />
                        ))
                    }
                </div>
            </div>
        </div>
    )
}