import './paginator.scss';
import _ from 'lodash';

export default function Paginator({ pageCount }: { pageCount: number }) {
    return (
        <div className="paginator-container">
            <button className="prev">
                <i className="las la-angle-left"></i>
            </button>
            <select className="pages">
                {_.range(1, pageCount + 1).map(page =>
                    <option key={page.toString()} value={page}>Page {page}</option>)}
            </select>
            <button className="next">
                <i className="las la-angle-right"></i>
            </button>
        </div>
    );
}
