import { ReactNode } from 'react';
import SiteTopBar from '../site-top-bar/site-top-bar';
import './site-wrapper.scss';
import InfoBar from '../site-info-bar/info-bar';

export default function SiteWrapper({ children, hideButtons = false }: { children: ReactNode, hideButtons?: boolean }) {
    return (
        <div className="site-wrapper">
            <InfoBar />
            <SiteTopBar hideButtons={hideButtons} />
            {children}
        </div>
    );
}
