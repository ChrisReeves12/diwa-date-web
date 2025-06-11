import { ReactNode } from 'react';
import SiteTopBar from '../site-top-bar/site-top-bar';
import './site-wrapper.scss';

export default function SiteWrapper({ children }: { children: ReactNode }) {
    return (
        <div className="site-wrapper">
            <SiteTopBar />
            {children}
        </div>
    );
}
