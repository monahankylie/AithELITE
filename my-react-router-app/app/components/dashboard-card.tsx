import { Component, type ReactNode } from "react";
import type { PlayerCardProps } from "./playercard";

type DashboardCardProps = Pick<PlayerCardProps, "name" | "position" | "school" | "avatarUrl"> & {
  sport: string;
  gradYear: number | string;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  checked?: boolean;
  className?: string;
};

abstract class GenericCard<TProps extends { className?: string }> extends Component<TProps> {
  protected cardClassName() {
    return this.props.className ?? "";
  }

  protected abstract renderBody(): ReactNode;

  render() {
    return (
      <article
        className={`
          w-full bg-transparent px-8 py-6
          ${this.cardClassName()}
        `}
      >
        {this.renderBody()}
      </article>
    );
  }
}

function ChevronDown() {
  return (
    <span className="inline-block h-7 w-7 border-[3px] border-slate-900" aria-hidden="true" />
  );
}

export default class DashboardCard extends GenericCard<DashboardCardProps> {
  protected renderBody() {
    const {
      name,
      sport,
      school,
      position,
      gradYear,
      pointsPerGame,
      reboundsPerGame,
      assistsPerGame,
      avatarUrl,
      checked,
    } = this.props;

    return (
      <div className="grid items-center gap-6 md:grid-cols-[160px_minmax(0,1.2fr)_420px_40px]">
        <div className="flex justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt={`${name} avatar`} className="h-36 w-36 rounded-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-36 w-36 items-center justify-center rounded-full bg-neutral-500 text-5xl font-semibold text-white">
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <h3 className="truncate text-[2.55rem] font-bold tracking-tight text-slate-700">{name}</h3>
            <p className="text-[1.2rem] font-medium text-slate-600">
              {sport} / {position}
            </p>
          </div>
          <p className="mt-2 text-[1.15rem] text-slate-600">
            {school} / Class of {gradYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-[1.3rem] text-slate-700 md:justify-self-center">
          <span className="font-medium">
            <strong className="mr-1 text-slate-800">PPG:</strong>
            <span className="tabular-nums">{pointsPerGame.toFixed(1)}</span>
          </span>
          <span className="font-medium">
            <strong className="mr-1 text-slate-800">RPG:</strong>
            <span className="tabular-nums">{reboundsPerGame.toFixed(1)}</span>
          </span>
          <span className="font-medium">
            <strong className="mr-1 text-slate-800">APG:</strong>
            <span className="tabular-nums">{assistsPerGame.toFixed(1)}</span>
          </span>
        </div>

        <div className="justify-self-end">
          <ChevronDown />
          {checked ? <span className="sr-only">Selected</span> : null}
        </div>
      </div>
    );
  }
}
