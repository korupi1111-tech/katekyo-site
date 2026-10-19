import "../campaign-dock.css";

export function CampaignDock({ onOpen }: { onOpen: () => void }) {
  return <button className="campaignDock" onClick={onOpen}><span>FREE PERIOD</span><b>現在は<br />無料期間中</b><small>最大2年間無料の条件 →</small></button>;
}
