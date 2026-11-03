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

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchDepartures = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `https://xmlopen.rejseplanen.dk/bin/rest.exe/departureBoard?id=${currentOrigin.id}&format=json`;
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
      
      if (!res.ok) {
        throw new Error(`Fejl ved forbindelse til Rejseplanen (Status: ${res.status})`);
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error('Modtog et ugyldigt svarformat fra Rejseplanen API.');
      }

      const rawBoard = data?.DepartureBoard?.Departure;
      if (!rawBoard) {
        setDepartures([]);
        setLoading(false);
        return;
      }

      const list = Array.isArray(rawBoard) ? rawBoard : [rawBoard];

      const parsed = list.map((item, index) => {
        const name = (item.name || '').trim();
        const dest = (item.direction || '').trim();
        
        let type = 'RE';
        if (name.startsWith('S-tog') || name.includes('Linje E') || name === 'E') {
          type = 'S-TOG';
        } else if (name.includes('ICL') || name.includes('Lyn')) {
          type = 'ICL';
        } else if (name.includes('IC')) {
          type = 'IC';
        }

        return {
          id: `${item.date}-${item.time}-${index}`,
          time: item.time ? item.time.substring(0, 5) : '--:--',
          rtTime: item.rtTime ? item.rtTime.substring(0, 5) : null,
          type: type,
          lineName: name || type,
          finalDestination: dest || currentDest.name,
          track: item.rtTrack || item.track || '1',
          delay: !!item.rtTime && item.rtTime !== item.time,
          rawDest: dest.toLowerCase()
        };
      });

      // Filtrer afgange efter retning
      const filtered = parsed.filter(item => {
        const dest = item.rawDest;
        const isS = item.type === 'S-TOG';

        let isCorrectDirection = false;
        if (direction === 'KOGE_TO_CPH') {
          // Mod København H / nordpå
          isCorrectDirection = dest.includes('københavn') || dest.includes('østerport') || dest.includes('helsingør') || dest.includes('holte') || dest.includes('hillerød') || dest.includes('klampenborg');
        } else {
          // Mod Køge Nord / sydpå
          isCorrectDirection = dest.includes('køge') || dest.includes('næstved') || dest.includes('nykøbing') || dest.includes('rødby') || dest.includes('esbjerg');
        }

        if (!isCorrectDirection) return false;
        if (!showSTrain && isS) return false;

        return true;
      });

      setDepartures(filtered);
    } catch (err) {
      console.error('API Error:', err);
      // NULSTIL DEPARTURES SÅ INGEN GAMLE/FALSKE DATA VISES
      setDepartures([]);
      setError('Kunne ikke hente live-data fra Rejseplanen. Tjek din internetforbindelse eller prøv igen om et øjeblik.');
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
    <div className="
