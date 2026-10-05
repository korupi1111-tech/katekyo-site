import "../campaign-dock.css";

export function CampaignDock({ onOpen }: { onOpen: () => void }) {
  return <button className="campaignDock" onClick={onOpen}><span>FOUNDING CAMPAIGN</span><b>創設期メンバー<br />初年度無料</b><small>対象条件を見る →</small></button>;
}
