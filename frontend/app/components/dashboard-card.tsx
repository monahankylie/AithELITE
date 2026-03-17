import { Component, type ReactNode } from "react";
import { athleteFormatter } from "../lib/athlete-formatter";

export type DashboardCardProps = {
  id: string;
  name: string;
  sport: string;
  position: string;
  school: string;
  gradYear: number | string;
  avatarUrl?: string;
  checked?: boolean;
  selectable?: boolean;
  onToggle?: (id: string) => void;
  className?: string;
};

export abstract class GenericCard<TProps extends { className?: string }> extends Component<TProps> {
  protected cardClassName() {
    return this.props.className ?? "";
  }

  protected abstract renderBody(): ReactNode;

  render() {
    return (
      <article
        className={`
          w-full bg-transparent py-[1px]
          ${this.cardClassName()}
        `}
      >
        {this.renderBody()}
      </article>
    );
  }
}

/**
 * BASE DASHBOARD CARD
 */
export class BaseDashboardCard<T extends DashboardCardProps = DashboardCardProps> extends GenericCard<T> {
  protected renderStats(): ReactNode {
    return (
      <div className="flex flex-wrap items-center gap-5 text-[1rem] text-[#00599c]/40 md:justify-self-center uppercase font-black">
        STATS UNAVAILABLE
      </div>
    );
  }

  protected renderBody() {
    const {
      id,
      name,
      sport,
      school,
      position,
      gradYear,
      avatarUrl,
      checked,
      selectable = false,
      onToggle,
    } = this.props;

    return (
      <div 
        onClick={() => selectable && onToggle?.(id)}
        className={`
          relative grid items-center gap-6 p-3 rounded-[28px] transition-all duration-200
          ${selectable ? "cursor-pointer" : ""}
          ${checked 
            ? "bg-[#00599c]/5 ring-4 ring-[#00599c] z-10" 
            : "bg-white ring-0 border border-slate-200 hover:border-[#00599c]/30 shadow-sm"
          }
          md:grid-cols-[120px_minmax(0,1fr)_420px]
        `}
      >
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${name} avatar`} className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-sm" loading="lazy" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-50 text-4xl font-black text-slate-200">
                {name.charAt(0)}
              </div>
            )}
            {checked && (
              <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#00599c] text-white shadow-md">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Info - Strictly Stacked */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className={`truncate text-3xl font-black tracking-tight leading-none mb-2 uppercase transition-colors ${
            checked ? "text-[#00599c]" : "text-slate-900"
          }`}>
            {name}
          </h3>
          <div className="flex items-center gap-3 overflow-hidden">
             <p className="text-[1.1rem] font-bold text-[#00599c]/70 uppercase tracking-tight whitespace-nowrap">
              {sport} • {position}
            </p>
            <span className="text-[#00599c]/30">•</span>
            <p className="truncate text-[1.1rem] font-medium text-[#00599c]/60 uppercase">
              {school}
            </p>
            <span className="text-[#00599c]/30">•</span>
            <p className="text-[1.1rem] font-bold text-[#00599c]/40 uppercase tracking-tight whitespace-nowrap">
              {gradYear}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="transition-opacity duration-300">
          {this.renderStats()}
        </div>
      </div>
    );
  }
}

/**
 * BASKETBALL DASHBOARD CARD
 */
export type BasketballDashboardCardProps = DashboardCardProps & {
  averages?: {
    ppg: number;
    rpg: number;
    apg: number;
  };
};

export default class BasketballDashboardCard extends BaseDashboardCard<BasketballDashboardCardProps> {
  protected renderStats() {
    const { averages, checked } = this.props;

    if (!averages) return super.renderStats();

    return (
      <div className={`
        flex flex-wrap items-center gap-6 text-[1.4rem] md:justify-self-center p-4 rounded-2xl border transition-all
        ${checked 
          ? "bg-[#00599c]/10 border-[#00599c]/30 text-[#00599c]" 
          : "bg-[#00599c]/[0.02] border-[#00599c]/10 text-[#00599c]/80"
        }
      `}>
        <div className="flex flex-col items-center px-5">
          <span className={`text-[0.65rem] font-black uppercase tracking-[0.2em] mb-1 ${checked ? "text-[#00599c]/60" : "text-[#00599c]/40"}`}>PPG</span>
          <span className="font-black tabular-nums">{athleteFormatter.formatStat(averages.ppg)}</span>
        </div>
        <div className={`h-10 w-px ${checked ? "bg-[#00599c]/20" : "bg-[#00599c]/10"}`} />
        <div className="flex flex-col items-center px-5">
          <span className={`text-[0.65rem] font-black uppercase tracking-[0.2em] mb-1 ${checked ? "text-[#00599c]/60" : "text-[#00599c]/40"}`}>RPG</span>
          <span className="font-black tabular-nums">{athleteFormatter.formatStat(averages.rpg)}</span>
        </div>
        <div className={`h-10 w-px ${checked ? "bg-[#00599c]/20" : "bg-[#00599c]/10"}`} />
        <div className="flex flex-col items-center px-5">
          <span className={`text-[0.65rem] font-black uppercase tracking-[0.2em] mb-1 ${checked ? "text-[#00599c]/60" : "text-[#00599c]/40"}`}>APG</span>
          <span className="font-black tabular-nums">{athleteFormatter.formatStat(averages.apg)}</span>
        </div>
      </div>
    );
  }
}
