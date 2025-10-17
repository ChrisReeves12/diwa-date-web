import './tab-bar.scss';
import Link from "next/link";

interface TabBarEntry {
    label: string;
    iconString?: string;
    icon?: any;
    isSelected?: boolean;
    url: string;
}

export default function TabBar({ tabs }: { tabs: TabBarEntry[] }) {
    return (
        <div className="tab-bar-container">
            {tabs.map(tab => (
                <Link href={tab.url} key={tab.label}>
                    <div className={`tab ${tab.isSelected ? 'selected' : ''}`}>
                        {tab.iconString ? <i className={tab.iconString}></i> : tab.icon}
                        <span className="label">{tab.label}</span>
                    </div>
                </Link>
            ))}
        </div>
    );
}
