import React, { useState, useEffect } from 'react';
import { Search, Globe, Plus, Home, Code, Type, Loader, Trash2, User, LogOut, LogIn, Edit, Mic, Image } from 'lucide-react';

const sanitize = (html) => {
  let clean = html;
  ['script', 'iframe', 'object', 'embed'].forEach(tag => {
    clean = clean.replace(new RegExp('<' + tag + '[^>]*>.*?</' + tag + '>', 'gis'), '');
  });
  return clean.replace(/on\w+\s*=/gi, '').replace(/javascript:/gi, '');
};

const contentFilter = (text) => {
  const bannedWords = [
    'child porn', 'cp', 'pedofil', 'lolita', 'preteen', 
    'heroin', 'kokain', 'metamfetamin', 'crystal meth', 'fentanyl',
    'bomb tutorial', 'how to make bomb', 'terrorist', 'kill yourself',
    'detske porno', 'detske nahé', 'sex s detmi', 'maloletý sex',
    'drogy predaj', 'kupit heroin', 'kupit kokain', 'dealer drog',
    'vyroba bomby', 'ako vyrobit bombu', 'teroristický', 'samovražda návod'
  ];
  
  const textLower = text.toLowerCase();
  for (const word of bannedWords) {
    if (textLower.includes(word)) {
      return { blocked: true, reason: 'Obsah porušuje pravidlá (zakázané slová)' };
    }
  }
  
  // Check for suspicious patterns
  if (/(child|kid|minor|malolet).*?(nude|naked|sex|nahý|sex)/gi.test(textLower)) {
    return { blocked: true, reason: 'Obsah porušuje pravidlá (podozrivý vzor)' };
  }
  
  if (/(buy|sell|predaj|kupit).*(drug|heroin|cocaine|meth|droga|kokain)/gi.test(textLower)) {
    return { blocked: true, reason: 'Obsah porušuje pravidlá (nelegálny predaj)' };
  }
  
  return { blocked: false };
};

const BakySearch = () => {
  const loadStorage = (key, def) => {
    try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; }
  };

  const [view, setView] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(null);
  const [pages, setPages] = useState(() => {
    const saved = loadStorage('baky_pages', {});
    if (Object.keys(saved).length === 0) {
      return { 'bakysearch': { domain: 'bakysearch.slo', title: 'Baky Search', content: '<div style="padding:60px;text-align:center;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:20px"><h1>Vitaj v Baky Search</h1><p>Slovensky internet zadarmo</p></div>', created: new Date().toISOString(), views: 0, owner: 'system' }};
    }
    return saved;
  });
  const [users, setUsers] = useState(() => loadStorage('baky_users', {'admin': {username: 'admin', password: 'admin123'}}));
  const [currentUser, setCurrentUser] = useState(() => loadStorage('baky_user', null));
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [domain, setDomain] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState('simple');
  const [editing, setEditing] = useState(null);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState('16');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [imgUrl, setImgUrl] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState('');

  useEffect(() => { localStorage.setItem('baky_pages', JSON.stringify(pages)); }, [pages]);
  useEffect(() => { localStorage.setItem('baky_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { if (currentUser) localStorage.setItem('baky_user', JSON.stringify(currentUser)); else localStorage.removeItem('baky_user'); }, [currentUser]);

  const login = () => {
    if (!authUser || !authPass) { alert('Vypln polia'); return; }
    const u = users[authUser];
    if (!u || u.password !== authPass) { alert('Zle meno/heslo'); return; }
    setCurrentUser(u);
    setShowAuth(false);
    setAuthUser('');
    setAuthPass('');
  };

  const register = () => {
    if (!authUser || !authPass) { alert('Vypln polia'); return; }
    if (users[authUser]) { alert('Meno existuje'); return; }
    if (authPass.length < 6) { alert('Min 6 znakov'); return; }
    const u = {username: authUser, password: authPass};
    setUsers({...users, [authUser]: u});
    setCurrentUser(u);
    setShowAuth(false);
    setAuthUser('');
    setAuthPass('');
  };

  const search = (q) => {
    setLoading(true);
    setTimeout(() => {
      let all = Object.values(pages);
      if (currentUser) { all = all.filter(p => p.owner === currentUser.username || p.owner === 'system'); }
      else { all = all.filter(p => p.owner === 'system'); }
      const r = all.filter(p => !q || p.title.toLowerCase().includes(q.toLowerCase()) || p.domain.toLowerCase().includes(q.toLowerCase()));
      setResults(r);
      setLoading(false);
    }, 300);
  };

  const addImg = () => {
    if (!imgUrl) return;
    const img = mode === 'simple' ? '\n[IMG:' + imgUrl + ']\n' : '\n<img src="' + imgUrl + '" style="max-width:100%;height:auto;margin:20px 0;border-radius:10px" alt="img">\n';
    setContent(content + img);
    setImgUrl('');
  };

  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Hlasove vyhladavanie nie je podporovane v tomto prehliadaci. Pouzi Chrome alebo Edge.');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'sk-SK';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      search(transcript);
      setIsListening(false);
    };
    
    recognition.onerror = () => {
      setIsListening(false);
      alert('Chyba pri rozpoznavani hlasu. Skus znova.');
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
  };

  const searchImages = () => {
    if (!imageSearchQuery) {
      alert('Zadaj co chces najst');
      return;
    }
    window.open('https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(imageSearchQuery), '_blank');
  };

  const save = () => {
    if (!currentUser) { alert('Prihlаs sa'); setShowAuth(true); return; }
    if (!domain || !title) { alert('Vypln polia'); return; }
    
    // Content filtering
    const titleCheck = contentFilter(title);
    if (titleCheck.blocked) {
      alert('ZABLOKOVANE: ' + titleCheck.reason + '\n\nTvoj titulok obsahuje zakázaný obsah.');
      return;
    }
    
    const contentCheck = contentFilter(content);
    if (contentCheck.blocked) {
      alert('ZABLOKOVANE: ' + contentCheck.reason + '\n\nTvoj obsah porušuje pravidlá platformy.');
      return;
    }
    
    const d = domain.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!d) { alert('Neplatny nazov'); return; }
    if (!editing && pages[d]) { alert('Existuje'); return; }
    if (editing && editing !== d) { alert('Nemozes zmenit nazov'); return; }
    let c = content.trim();
    if (mode === 'simple') {
      const st = 'background-color:' + bgColor + ';color:' + textColor + ';font-size:' + fontSize + 'px;font-family:' + fontFamily + ';padding:40px;line-height:1.6;';
      const lines = c.split('\n').map(l => {
        if (l.startsWith('[IMG:') && l.endsWith(']')) {
          const u = l.substring(5, l.length - 1);
          return '<img src="' + u + '" style="max-width:100%;height:auto;margin:20px 0;border-radius:10px" alt="img">';
        }
        if (l.startsWith('# ')) return '<h1 style="font-size:2em;margin:20px 0">' + l.substring(2) + '</h1>';
        if (l.startsWith('## ')) return '<h2 style="font-size:1.5em;margin:15px 0">' + l.substring(3) + '</h2>';
        if (l.startsWith('**') && l.endsWith('**')) return '<p style="font-weight:bold;margin:10px 0">' + l.slice(2,-2) + '</p>';
        if (l.startsWith('*') && l.endsWith('*')) return '<p style="font-style:italic;margin:10px 0">' + l.slice(1,-1) + '</p>';
        return '<p style="margin:10px 0">' + (l || '<br>') + '</p>';
      }).join('');
      c = '<div style="' + st + '">' + lines + '</div>';
    }
    c = c || '<div style="padding:40px"><h2>Nova stranka</h2></div>';
    setPages({...pages, [d]: { domain: d + '.slo', title, content: sanitize(c), created: editing ? pages[editing].created : new Date().toISOString(), modified: editing ? new Date().toISOString() : undefined, views: editing ? pages[editing].views : 0, owner: currentUser.username }});
    setDomain(''); setTitle(''); setContent(''); setBgColor('#ffffff'); setTextColor('#000000'); setFontSize('16'); setFontFamily('Arial'); setEditing(null); setView('search');
    setTimeout(() => { setQuery(d); search(d); }, 100);
  };

  const viewPage = (dom) => {
    const k = dom.replace('.slo', '');
    const p = pages[k];
    if (p) { setPages({...pages, [k]: {...p, views: (p.views || 0) + 1}}); setCurrentPage({...p, views: (p.views || 0) + 1}); setView('browse'); }
  };

  const edit = (p) => {
    const k = p.domain.replace('.slo', '');
    setEditing(k); setDomain(k); setTitle(p.title); setContent(p.content); setMode(p.content.includes('<') ? 'html' : 'simple'); setView('register');
  };

  const del = (k) => {
    const p = pages[k];
    if (!currentUser || p.owner !== currentUser.username) { alert('Len svoje'); return; }
    if (k === 'bakysearch') { alert('Nemozes'); return; }
    if (confirm('Zmazat?')) { const n = {...pages}; delete n[k]; setPages(n); search(query); }
  };

  const pageCount = currentUser ? Object.values(pages).filter(p => p.owner === currentUser.username || p.owner === 'system').length : Object.values(pages).filter(p => p.owner === 'system').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white relative">
      {showAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-purple-800 p-8 rounded-3xl border-2 border-cyan-400 max-w-md w-full mx-4">
            <h2 className="text-3xl font-bold mb-6 text-cyan-400">{authMode === 'login' ? 'Prihlasenie' : 'Registracia'}</h2>
            <div className="space-y-4">
              <input type="text" value={authUser} onChange={e => setAuthUser(e.target.value)} placeholder="Meno" className="w-full px-4 py-3 bg-black border-2 border-cyan-400 rounded-xl text-white" />
              <input type="password" value={authPass} onChange={e => setAuthPass(e.target.value)} placeholder="Heslo" className="w-full px-4 py-3 bg-black border-2 border-cyan-400 rounded-xl text-white" />
              <button onClick={authMode === 'login' ? login : register} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-xl font-bold">{authMode === 'login' ? 'Prihlasit' : 'Registrovat'}</button>
              <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full py-2 text-cyan-300">{authMode === 'login' ? 'Registruj sa' : 'Prihlаs sa'}</button>
              <button onClick={() => { setShowAuth(false); setAuthUser(''); setAuthPass(''); }} className="w-full py-2 text-gray-400">Zrusit</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10">
        <div className="bg-black bg-opacity-40 backdrop-blur-xl border-b border-cyan-400 px-6 py-4">
          <div className="container mx-auto flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-3xl font-black text-cyan-400 cursor-pointer" onClick={() => setView('search')}>BAKY<span className="text-purple-400">.slo</span></h1>
            <div className="flex gap-3 flex-wrap items-center">
              <button onClick={() => setView('search')} className={'px-4 py-2 rounded-xl font-bold flex items-center gap-2 ' + (view === 'search' ? 'bg-cyan-500' : 'bg-white bg-opacity-10')}><Search size={18} /> Hladat</button>
              <button onClick={() => { if (currentUser) { setEditing(null); setDomain(''); setTitle(''); setContent(''); setView('register'); } else setShowAuth(true); }} className={'px-4 py-2 rounded-xl font-bold flex items-center gap-2 ' + (view === 'register' ? 'bg-cyan-500' : 'bg-white bg-opacity-10')}><Plus size={18} /> Vytvorit</button>
              <div className="px-4 py-2 rounded-xl bg-purple-500 bg-opacity-30"><Globe size={18} /> {pageCount}</div>
              {currentUser ? (
                <div className="flex gap-2">
                  <div className="px-4 py-2 rounded-xl bg-green-500 bg-opacity-30"><User size={18} /> {currentUser.username}</div>
                  <button onClick={() => setCurrentUser(null)} className="px-4 py-2 rounded-xl bg-red-500 bg-opacity-30"><LogOut size={18} /></button>
                </div>
              ) : (
                <button onClick={() => setShowAuth(true)} className="px-4 py-2 rounded-xl bg-green-500"><LogIn size={18} /> Prihlasit</button>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {view === 'search' && (
            <div>
              <div className="text-center mb-12">
                <h2 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">BAKY SEARCH</h2>
                <p className="text-xl text-cyan-300">Slovensky internet</p>
              </div>
              <div className="mb-8 max-w-4xl mx-auto">
                <div className="flex items-center bg-black bg-opacity-70 rounded-full border-2 border-cyan-400 transition-all hover:border-pink-500 hover:shadow-2xl px-2">
                  <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyPress={e => e.key === 'Enter' && search(query)} placeholder="Hladat..." className="flex-1 px-6 py-5 bg-transparent text-white text-xl focus:outline-none" />
                  <button onClick={startVoiceSearch} disabled={isListening} className={'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-125 ' + (isListening ? 'bg-red-500 animate-pulse' : 'bg-purple-500 hover:bg-purple-600 hover:shadow-xl hover:shadow-purple-500/50')}>
                    <Mic size={22} />
                  </button>
                  <button onClick={() => setShowImageSearch(!showImageSearch)} className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition-all duration-300 transform hover:scale-125 hover:shadow-xl hover:shadow-blue-500/50 ml-2">
                    <Image size={22} />
                  </button>
                  <button onClick={() => search(query)} disabled={loading} className="w-12 h-12 rounded-full flex items-center justify-center bg-cyan-500 hover:bg-pink-500 transition-all duration-300 transform hover:scale-125 hover:shadow-xl hover:shadow-cyan-500/50 ml-2 mr-1">{loading ? <Loader className="animate-spin" size={22} /> : <Search size={22} />}</button>
                </div>
                {showImageSearch && (
                  <div className="mt-4 p-6 bg-black bg-opacity-60 rounded-3xl border-2 border-blue-400 backdrop-blur-xl">
                    <h3 className="text-lg font-bold text-blue-300 mb-3 flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                        <Image size={20} />
                      </div>
                      Vyhladavanie obrazkov
                    </h3>
                    <div className="flex gap-2">
                      <input type="text" value={imageSearchQuery} onChange={e => setImageSearchQuery(e.target.value)} onKeyPress={e => e.key === 'Enter' && searchImages()} placeholder="Co chces najst? (napr. cute cats)" className="flex-1 px-4 py-3 bg-black border-2 border-blue-400 rounded-full text-white focus:outline-none focus:border-blue-500 transition-all" />
                      <button onClick={searchImages} className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full font-bold hover:shadow-xl transition-all duration-300 transform hover:scale-110">Hladat</button>
                    </div>
                    <p className="text-xs text-gray-400 mt-3 ml-1">Otvorí sa Google Images v novom okne</p>
                  </div>
                )}
                {isListening && (
                  <div className="mt-4 p-6 bg-red-500 bg-opacity-20 rounded-3xl border-2 border-red-400 text-center backdrop-blur-xl animate-pulse">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                        <Mic size={24} />
                      </div>
                      <p className="text-red-300 font-bold text-lg">Pocuvam...</p>
                    </div>
                    <p className="text-red-200 text-sm">Hovor teraz po slovensky</p>
                  </div>
                )}
              </div>
              <div className="max-w-4xl mx-auto space-y-6">
                {results.map((r, i) => {
                  const k = r.domain.replace('.slo', '');
                  const own = currentUser && r.owner === currentUser.username;
                  return (
                    <div key={i} className="bg-black bg-opacity-60 p-6 rounded-2xl border border-cyan-400 relative">
                      <div onClick={() => viewPage(r.domain)} className="cursor-pointer">
                        <h3 className="text-2xl font-bold text-cyan-400">{r.title}</h3>
                        <p className="text-green-400 text-sm mb-3">{r.domain}</p>
                        <p className="text-gray-300">{r.content.replace(/<[^>]*>/g, '').substring(0, 200)}...</p>
                        <div className="flex gap-4 mt-3 text-sm text-gray-400">
                          <span>{r.views || 0} navstev</span>
                          <span>{new Date(r.created).toLocaleDateString('sk-SK')}</span>
                          <span>Autor: {r.owner}</span>
                        </div>
                      </div>
                      {own && (
                        <div className="absolute top-4 right-4 flex gap-2">
                          <button onClick={() => edit(r)} className="p-2 bg-blue-500 bg-opacity-20 rounded-lg"><Edit size={18} /></button>
                          {k !== 'bakysearch' && <button onClick={() => del(k)} className="p-2 bg-red-500 bg-opacity-20 rounded-lg"><Trash2 size={18} /></button>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {!loading && results.length === 0 && (
                <div className="text-center py-12">
                  <button onClick={() => search('')} className="bg-purple-500 px-8 py-4 rounded-2xl font-bold text-xl">Zobrazit stranky ({pageCount})</button>
                </div>
              )}
            </div>
          )}

          {view === 'register' && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-black bg-opacity-60 p-8 rounded-3xl border-2 border-cyan-400">
                <h2 className="text-4xl font-black mb-6 text-cyan-400">{editing ? 'Upravit' : 'Vytvorit'}</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-cyan-300 mb-2 font-bold">Domena:</label>
                    <div className="flex gap-2">
                      <input type="text" value={domain} onChange={e => setDomain(e.target.value)} disabled={!!editing} className="flex-1 px-4 py-3 bg-black border-2 border-cyan-400 rounded-xl text-white disabled:opacity-50" />
                      <span className="text-2xl font-bold text-purple-400">.slo</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-cyan-300 mb-2 font-bold">Titulok:</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 bg-black border-2 border-cyan-400 rounded-xl text-white" />
                  </div>
                  <div>
                    <div className="flex gap-4 mb-4">
                      <button onClick={() => setMode('simple')} className={'px-4 py-2 rounded-xl font-bold ' + (mode === 'simple' ? 'bg-cyan-500' : 'bg-white bg-opacity-10')}><Type size={18} /> Text</button>
                      <button onClick={() => setMode('html')} className={'px-4 py-2 rounded-xl font-bold ' + (mode === 'html' ? 'bg-cyan-500' : 'bg-white bg-opacity-10')}><Code size={18} /> HTML</button>
                    </div>
                    {mode === 'simple' && (
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div><label className="block text-cyan-300 text-sm mb-2">Pozadie</label><input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full h-10 rounded-xl cursor-pointer" /></div>
                        <div><label className="block text-cyan-300 text-sm mb-2">Text</label><input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-full h-10 rounded-xl cursor-pointer" /></div>
                        <div><label className="block text-cyan-300 text-sm mb-2">Velkost</label><input type="number" value={fontSize} onChange={e => setFontSize(e.target.value)} min="10" max="48" className="w-full px-4 py-2 bg-black border-2 border-cyan-400 rounded-xl text-white" /></div>
                        <div><label className="block text-cyan-300 text-sm mb-2">Font</label><select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full px-4 py-2 bg-black border-2 border-cyan-400 rounded-xl text-white"><option>Arial</option><option>Georgia</option><option>Courier New</option><option>Times New Roman</option><option>Verdana</option></select></div>
                      </div>
                    )}
                    <div className="mb-4">
                      <label className="block text-cyan-300 text-sm mb-2">Obrazok URL</label>
                      <div className="flex gap-2">
                        <input type="text" value={imgUrl} onChange={e => setImgUrl(e.target.value)} placeholder="https://..." className="flex-1 px-4 py-2 bg-black border-2 border-cyan-400 rounded-xl text-white" />
                        <button onClick={addImg} className="px-6 py-2 bg-purple-500 rounded-xl font-bold">Vlozit</button>
                      </div>
                    </div>
                    {mode === 'simple' && (<div className="mb-4 p-4 bg-blue-500 bg-opacity-10 rounded-xl border border-blue-400"><p className="text-sm text-blue-300 font-bold mb-2">Formatovanie:</p><p className="text-xs text-gray-300"># Nadpis | ## Podnadpis | **tucne** | *kurziva*</p></div>)}
                    
                    <div className="mb-4 p-4 bg-red-500 bg-opacity-10 rounded-xl border border-red-400">
                      <p className="text-sm text-red-300 font-bold mb-2">Zakazany obsah:</p>
                      <p className="text-xs text-gray-300">• Detske porno a sexualne zneuživanie detí</p>
                      <p className="text-xs text-gray-300">• Predaj drog a nelegalne látky</p>
                      <p className="text-xs text-gray-300">• Násilny extremizmus a terorismus</p>
                      <p className="text-xs text-gray-300">• Navody na sebapoškodenie</p>
                      <p className="text-xs text-red-400 mt-2 font-bold">Porušenie pravidiel = okamžite zmazanie</p>
                    </div>
                    
                    <label className="block text-cyan-300 mb-2 font-bold">Obsah:</label>
                    <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={mode === 'simple' ? '# Ahoj\n\nMoja stranka' : '<h1>Ahoj</h1><p>Text</p>'} className="w-full px-4 py-3 bg-black border-2 border-cyan-400 rounded-xl text-white h-64" style={{fontFamily: mode === 'html' ? 'monospace' : 'inherit'}} />
                  </div>
                  <div className="flex gap-4">
                    <button onClick={save} className="flex-1 py-4 bg-cyan-500 rounded-xl font-bold text-xl">{editing ? 'Ulozit' : 'Vytvorit'}</button>
                    {editing && <button onClick={() => { setEditing(null); setView('search'); }} className="px-8 py-4 bg-red-500 rounded-xl font-bold">Zrusit</button>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'browse' && currentPage && (
            <div className="max-w-5xl mx-auto">
              <div className="mb-6 flex justify-between">
                <button onClick={() => setView('search')} className="px-6 py-3 bg-white bg-opacity-10 rounded-xl flex items-center gap-2"><Home size={20} /> Spat</button>
                {currentUser && currentPage.owner === currentUser.username && <button onClick={() => edit(currentPage)} className="px-6 py-3 bg-blue-500 bg-opacity-30 rounded-xl flex items-center gap-2"><Edit size={20} /> Upravit</button>}
              </div>
              <div className="bg-black bg-opacity-60 rounded-3xl border-2 border-cyan-400 overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-500 to-pink-500 px-6 py-4 flex justify-between">
                  <div><h2 className="text-2xl font-bold">{currentPage.title}</h2><p className="text-sm">{currentPage.domain}</p></div>
                  <div className="text-sm">{currentPage.views} navstev</div>
                </div>
                <div className="p-8 bg-white text-black min-h-96" dangerouslySetInnerHTML={{__html: currentPage.content}} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BakySearch;
