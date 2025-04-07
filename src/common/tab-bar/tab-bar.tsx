import './tab-bar.scss';
import Link from "next/link";

interface TabBarEntry {
    label: string;
    icon: string;
    isSelected?: boolean;
    url: string;
}

export default function TabBar({ tabs }: { tabs: TabBarEntry[] }) {
    return (
        <div className="tab-bar-container">
            { tabs.map(tab => (
                <Link href={tab.url} key={tab.label}>
                    <div  className={`tab ${tab.isSelected ? 'selected' : ''}`}>
                        <i className={tab.icon}></i>
                        <span className="label">{tab.label}</span>
                    </div>
                </Link>
            ))}
        </div>
    );
}
