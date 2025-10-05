export default function StatsCard(){
    return(
        <div className="md:col-span-6 rounded-2xl bg-gray-900 text-gray-100 p-4">
            <h2 id="leaderboard-title" className="text-slate-100 text-xl font-semibold">
                League Records
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                <div className="bg-sky-950 rounded-lg shadow-lg col-span-1 p-3">
                    <h3 className="font-bold">Best Week</h3>
                    <div className="grid grid-cols-3 pt-3">
                        <div className="flex flex-col gap-1 justify-center items-center">
                            <span className="text-slate-200 text-sm font-semibold">Scott <span className="text-xs ">(GW1)</span></span>
                            <MedalChip value={20} rank={2}></MedalChip>
                        </div>
                        <div className="flex flex-col gap-1 justify-center items-center">
                            <span className="text-slate-200 text-sm font-semibold">Scott <span className="text-xs ">(GW1)</span></span>
                            <MedalChip value={30} rank={1}></MedalChip>
                        </div>
                        <div className="flex flex-col gap-1 justify-center items-center">
                            <span className="text-slate-200 text-sm font-semibold">Scott <span className="text-xs ">(GW1)</span></span>
                            <MedalChip value={25} rank={3}></MedalChip>
                        </div>
                    </div>
                    
                </div>
                <div className="bg-sky-950 rounded-lg shadow-lg col-span-1 p-3">
                    <h3 className="font-bold">Biggest Stinker</h3>
                    <div className="grid grid-cols-3 pt-3">
                        <div className="flex flex-col gap-1 justify-center items-center">
                            <span className="text-slate-200 text-sm font-semibold">Scott <span className="text-xs ">(GW1)</span></span>
                            <MedalChip value={20} rank={2}></MedalChip>
                        </div>
                        <div className="flex flex-col gap-1 justify-center items-center">
                            <span className="text-slate-200 text-sm font-semibold">Scott <span className="text-xs ">(GW1)</span></span>
                            <MedalChip value={30} rank={1}></MedalChip>
                        </div>
                        <div className="flex flex-col gap-1 justify-center items-center">
                            <span className="text-slate-200 text-sm font-semibold">Scott <span className="text-xs ">(GW1)</span></span>
                            <MedalChip value={25} rank={3}></MedalChip>
                        </div>
                    </div>
                </div>
                   <div className="bg-sky-950 rounded-lg shadow-lg col-span-1 p-3">
                    <h3 className="font-bold">Worst % points left on bench</h3>
                    <div className="grid grid-cols-3 pt-3">
                        <div className="flex flex-col gap-1 justify-center items-center">
                            <span className="text-slate-200 text-sm font-semibold">Scott <span className="text-xs ">(GW1)</span></span>
                            <MedalChip value={20} rank={2} label="%"></MedalChip>
                        </div>
                        <div className="flex flex-col gap-1 justify-center items-center">
                            <span className="text-slate-200 text-sm font-semibold">Scott <span className="text-xs ">(GW1)</span></span>
                            <MedalChip value={30} rank={1} label="%"></MedalChip>
                        </div>
                        <div className="flex flex-col gap-1 justify-center items-center">
                            <span className="text-slate-200 text-sm font-semibold">Scott <span className="text-xs ">(GW1)</span></span>
                            <MedalChip value={25} rank={3} label="%"></MedalChip>
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    )
}

function MedalChip({
  label = " pts",
  value,
  rank,
}: {
  label?: string;
  value: number;
  rank: 1 | 2 | 3;
}) {
  const tone =
    rank === 1
      ? "text-white text-shadow-lg/30 ring-amber-400/60 bg-[linear-gradient(135deg,#f3e08c_0%,#f0c04a_35%,#c69428_65%,#e8cf7a_100%)]"
      : rank === 2
      ? "text-slate-900 text-shadow-sm ring-slate-400/60 bg-[linear-gradient(135deg,#e8edf3_0%,#cbd3dc_35%,#aeb6c3_65%,#dfe6ee_100%)]"
      : "text-white text-shadow-lg/20 ring-amber-900/40 bg-[linear-gradient(135deg,#eabf8a_0%,#c88549_35%,#9e5f2f_65%,#edc79b_100%)]";

  return (
    <div
      className={`relative overflow-hidden flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ring-1 shadow-sm ${tone}`}
    >
      <span className="text-lg font-bold tabular-nums">
        {value}
        <span className="text-sm">{label}</span>
      </span>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 "
      />
    </div>
  );
}
