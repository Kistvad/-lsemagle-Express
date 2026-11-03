import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowUp, Check, Train, AlertCircle } from 'lucide-react';

const STATIONS = {
  KOGE_NORD: { id: '8600072', name: 'Køge Nord St.' },
  COPENHAGEN: { id: '8600626', name: 'København H' },
};

export default function App() {
  const [direction, setDirection] = useState('KOGE_TO_CPH'); // 'KOGE_TO_CPH' or 'CPH_TO_KOGE'
  const [showSTrain, setShowSTrain] = useState(false);
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTopBtn, setShowTopBtn] = useState(false);

  const currentOrigin = direction === 'KOGE_TO_CPH' ? STATIONS.KOGE_NORD : STATIONS.COPENHAGEN;
  const currentDest = direction === 'KOGE_TO_CPH' ? STATIONS.COPENHAGEN : STATIONS.KOGE_NORD;

  // Track scroll position for Top button
  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch live departures from Rejseplanen API
  const fetchDepartures = async () => {
    setLoading(true);
    setError(null);

    try {
      const targetUrl = `https://xmlopen.rejseplanen.dk/bin/rest.exe/departureBoard?id=${currentOrigin.id}&format=json`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Kunne ikke hente data fra Rejseplanen');
      
      const data = await res.json();
      const rawBoard = data?.DepartureBoard?.Departure || [];
      const list = Array.isArray(rawBoard) ? rawBoard : [rawBoard];

      // Filter for trains heading towards the selected destination
      const filtered = list.filter((item) => {
        if (!item || !item.name) return false;

        const name = item.name.trim();
        const dest = (item.direction || '').toLowerCase();
        const isS = name.startsWith('S-tog') || name.includes('Linje E') || name === 'E';

        let isCorrectDirection = false;
        if (direction === 'KOGE_TO_CPH') {
          isCorrectDirection = dest.includes('københavn') || dest.includes('østerport') || dest.includes('helsingør') || dest.includes('holte') || dest.includes('hillerød');
        } else {
          isCorrectDirection = dest.includes('køge') || dest.includes('næstved') || dest.includes('nykøbing') || dest.includes('rødby') || dest.includes('esbjerg');
        }

        if (!isCorrectDirection) return false;
        if (!showSTrain && isS) return false;

        return true;
      });

      const parsed = filtered.map((item, index) => {
        const name = item.name.trim();
        let type = 'RE';
        if (name.startsWith('S-tog') || name.includes('Linje E') || name === 'E') type = 'S-TOG';
        else if (name.includes('ICL') || name.includes('Lyn')) type = 'ICL';
        else if (name.includes('IC')) type = 'IC';

        return {
          id: `${item.rtDate || item.date}-${item.rtTime || item.time}-${index}`,
          time: item.time ? item.time.substring(0, 5) : '--:--',
          rtTime: item.rtTime ? item.rtTime.substring(0, 5) : null,
          type: type,
          lineName: name,
          finalDestination: item.direction || currentDest.name,
          track: item.rtTrack || item.track || '1',
          delay: !!item.rtTime && item.rtTime !== item.time,
        };
      });

      setDepartures(parsed);
    } catch (err) {
      console.error(err);
      setError('Der opstod en fejl ved hentning af live-data fra Rejseplanen.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartures();
  }, [direction, showSTrain]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans pb-12">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-20 shadow-md">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Train className="w-6 h-6 text-red-500" />
            <h1 className="text-lg font-bold text-white tracking-tight">Ølsemagle Express</h1>
          </div>
          <button
            onClick={fetchDepartures}
            className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition text-slate-200"
            title="Opdater"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-md mx-auto flex border-t border-slate-700/50">
          <button
            onClick={() => setDirection('KOGE_TO_CPH')}
            className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition ${
              direction === 'KOGE_TO_CPH'
                ? 'border-red-500 text-white bg-slate-700/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Køge Nord ➔ København H
          </button>
          <button
            onClick={() => setDirection('CPH_TO_KOGE')}
            className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition ${
              direction === 'CPH_TO_KOGE'
                ? 'border-red-500 text-white bg-slate-700/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            København H ➔ Køge Nord
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 flex-1">
        {/* Filter Controls */}
        <div className="mb-4 flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
          <label htmlFor="s-tog-checkbox" className="flex items-center gap-3 cursor-pointer select-none">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${showSTrain ? 'bg-red-600 border-red-600' : 'border-slate-500 bg-slate-700'}`}>
              {showSTrain && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
            </div>
            <input
              id="s-tog-checkbox"
              type="checkbox"
              checked={showSTrain}
              onChange={(e) => setShowSTrain(e.target.checked)}
              className="sr-only"
            />
            <span className="text-sm font-medium text-slate-200">Vis S-tog (Linje E)</span>
          </label>
          <span className="text-xs text-slate-400">Standard: Skjult</span>
        </div>

        {/* Loading / Error States */}
        {loading && departures.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-red-500" />
            <p className="text-sm">Henter live-afgange fra Rejseplanen...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl flex items-start gap-3 text-red-200 my-4">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && departures.length === 0 && !error && (
          <div className="py-12 text-center text-slate-400 bg-slate-800/30 rounded-xl border border-slate-800">
            <p className="text-base font-medium text-slate-300">Ingen afgange fundet</p>
            <p className="text-xs mt-1 text-slate-500">Prøv at slå "Vis S-tog" til for at se flere tog.</p>
          </div>
        )}

        <div className="space-y-2.5">
          {departures.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 flex items-center justify-between shadow-sm hover:border-slate-600 transition"
            >
              <div className="flex items-center gap-3.5">
                {item.type === 'S-TOG' ? (
                  <div className="w-9 h-9 bg-red-600 rounded flex items-center justify-center text-white font-black text-xl tracking-tighter shrink-0 shadow-inner">
                    S
                  </div>
                ) : item.type === 'RE' ? (
                  <div className="w-9 h-9 bg-[#00828A] rounded flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner">
                    RE
                  </div>
                ) : item.type === 'IC' ? (
                  <div className="w-9 h-9 bg-[#8A1820] rounded flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner">
                    IC
                  </div>
                ) : (
                  <div className="w-9 h-9 bg-[#D32F2F] rounded flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner">
                    ICL
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{item.lineName}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-medium">
                      Spor {item.track}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Mod {item.finalDestination}</p>
                </div>
              </div>

              <div className="text-right">
                {item.delay ? (
                  <div>
                    <span className="text-xs line-through text-slate-500 block">{item.time}</span>
                    <span className="text-lg font-bold text-red-400">{item.rtTime}</span>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-slate-100">{item.time}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Sticky Top Scroll Button */}
      {showTopBtn && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-all duration-200 z-30"
          title="Gå til toppen"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
