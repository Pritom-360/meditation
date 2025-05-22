document.addEventListener('DOMContentLoaded', function() {
    // Preloader
    window.addEventListener('load', function() {
        const preloader = document.querySelector('.preloader');
        if (preloader) {
            preloader.classList.add('fade-out');
            setTimeout(() => {
                if (preloader) preloader.style.display = 'none';
            }, 500);
        }
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#') && href.length > 1 && document.getElementById(href.substring(1))) {
                e.preventDefault();
                const targetId = href; // href includes '#'
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const offset = navbar ? navbar.offsetHeight : 70;
                    window.scrollTo({ top: targetElement.offsetTop - offset, behavior: 'smooth' });
                    const navbarCollapse = document.querySelector('.navbar-collapse');
                    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                        navbarCollapse.classList.remove('show');
                    }
                }
            }
            // Allow default behavior for links to other pages (e.g., home.html, meditation.html#meditate)
        });
    });


    // Owl Carousels
    if (typeof $ !== 'undefined' && $.fn.owlCarousel) {
        const sleepCarousel = $('.sleep-carousel');
        if (sleepCarousel.length) {
            sleepCarousel.owlCarousel({
                loop: true, margin: 20, nav: true, dots: true, center: false,
                responsive: { 0: { items: 1 }, 576: {items: 2}, 768: { items: 2 }, 992: { items: 3 } }
            });
        }
        const testimonialCarousel = $('.testimonial-carousel'); // On home.html
        if (testimonialCarousel.length) {
            testimonialCarousel.owlCarousel({
                loop: true, margin: 30, nav: false, dots: true,
                responsive: { 0: { items: 1 }, 768: { items: 2 } }
            });
        }
    }

    // --- AUDIO LOGIC ---
    const audioPlayer = document.getElementById('meditation-audio'); // Main content player
    const bgMusic = document.getElementById('bg-music');      // Background music (home.html only)
    
    let userInteracted = false; // Global flag for user interaction

    function playBgMusic() {
        if (!bgMusic) return;
        if (userInteracted && bgMusic.paused) {
            const promise = bgMusic.play();
            if (promise !== undefined) {
                promise.catch(error => {
                    console.error("[BG Music] Playback FAILED:", error.name, error.message);
                });
            }
        }
    }

    function pauseBgMusic() {
        if (!bgMusic) return;
        if (!bgMusic.paused) {
            bgMusic.pause();
        }
    }

    function handleFirstUserInteraction(event) {
        if (userInteracted) return;
        userInteracted = true;
        console.log(`User interaction DETECTED (Type: ${event ? event.type : 'unknown'}).`);

        if (bgMusic && bgMusic.hasAttribute('autoplay') && bgMusic.paused) {
            playBgMusic(); 
        }

        if (window.audioContext && window.audioContext.state === 'suspended') {
            window.audioContext.resume().catch(e => console.error("Error RESUMING AudioContext:", e));
        }
        if (audioPlayer && !audioPlayer.paused && !isVisualizing) {
            setupAudioContext();
        }
    }

    ['click', 'touchstart', 'keydown'].forEach(eventType => {
        document.addEventListener(eventType, handleFirstUserInteraction, { once: true, capture: true });
    });

    if (bgMusic && bgMusic.hasAttribute('autoplay')) {
        setTimeout(() => {
            if (bgMusic && bgMusic.paused && !userInteracted) {
                 console.warn("[BG Music] Initial Check: 'autoplay' bgMusic is PAUSED. Waiting for user interaction.");
            }
        }, 500);
    }

    if (audioPlayer) {
        audioPlayer.addEventListener('play', () => {
            pauseBgMusic();
            if (document.getElementById('home') && !document.getElementById('meditate')) { // Only home page default breathing
                stopBreathingAnimation(); 
            }
        });

        audioPlayer.addEventListener('pause', () => {
            setTimeout(() => { 
                if (audioPlayer.paused && !audioPlayer.ended && userInteracted) {
                    playBgMusic();
                }
            }, 50);
        });

        audioPlayer.addEventListener('ended', () => {
            if (userInteracted) {
                playBgMusic();
            } else if (bgMusic && bgMusic.hasAttribute('autoplay')) {
                 playBgMusic();
            }
        });
    }
    // --- END OF CORE AUDIO LOGIC FOR BACKGROUND MUSIC ---

    // Meditation Player Functionality
    const playPauseBtn = document.getElementById('play-pause');
    const progressBar = document.getElementById('progress-bar');
    const progressBarContainer = document.querySelector('.progress-container'); // For clickable area
    const currentTimeEl = document.querySelector('.current-time');
    const durationEl = document.querySelector('.duration');
    const sessionTitle = document.getElementById('session-title');
    const sessionDetails = document.getElementById('session-details');
    const sessionItems = document.querySelectorAll('.session-item');
    const soundCards = document.querySelectorAll('.sound-card');
    const sleepPlayBtns = document.querySelectorAll('.sleep-play-btn');
    const breathingInstruction = document.querySelector('.breath-instruction');
    const playerControlsDiv = document.querySelector('.player-controls');
    const playerActionsDiv = document.querySelector('.player-actions');


    function formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity || typeof seconds !== 'number') return '∞';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function updateProgress() {
        if (!audioPlayer || !progressBar || !currentTimeEl) return;
        const { currentTime, duration } = audioPlayer;
        if (isNaN(duration) || duration === Infinity) {
            if (progressBar) progressBar.style.width = '0%'; 
        } else {
           if (progressBar) {
                const progressPercent = (currentTime / duration) * 100;
                progressBar.style.width = `${progressPercent}%`;
           }
        }
        if (currentTimeEl) currentTimeEl.textContent = formatTime(currentTime);
    }
    
    // Use progressBarContainer for click events if available, fallback to specific clickable area div
    const progressBarClickTarget = document.querySelector('.progress-bar-clickable-area') || progressBarContainer;
    if (progressBarClickTarget && audioPlayer) {
        progressBarClickTarget.addEventListener('click', (e) => {
            if (!audioPlayer.duration || isNaN(audioPlayer.duration) || audioPlayer.duration === Infinity) return;
            const rect = progressBarClickTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const width = progressBarClickTarget.clientWidth;
            const duration = audioPlayer.duration;
            audioPlayer.currentTime = (clickX / width) * duration;
        });
    }
    

    if (playPauseBtn && audioPlayer) {
        playPauseBtn.addEventListener('click', () => {
            if (!userInteracted) handleFirstUserInteraction({type: 'playPauseBtnClick'});

            if (audioPlayer.paused) {
                if (!audioPlayer.src && !audioPlayer.currentSrc) {
                    const firstSessionItem = document.querySelector('.session-item.active[data-audio]') || document.querySelector('.session-item[data-audio]');
                    if (firstSessionItem) {
                        firstSessionItem.click(); 
                        audioPlayer.addEventListener('canplay', () => {
                            if (audioPlayer.paused) {
                                audioPlayer.play().catch(e => console.error("Error playing after loading first item:", e));
                            }
                        }, { once: true });
                        return;
                    }
                    // alert("Please select a meditation track first."); // Muted for less interruption
                    console.warn("Play clicked, but no track selected and no default found.");
                    return;
                }

                if (audioPlayer.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA || audioPlayer.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                     audioPlayer.play().catch(error => {
                        console.error("[Main Player] Playback FAILED:", error.name, error.message);
                        if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                    });
                } else {
                    audioPlayer.load(); // Ensure it tries to load if not ready
                    const playWhenReady = () => {
                        audioPlayer.play().catch(error => {
                            console.error("[Main Player] Playback FAILED after 'canplay':", error.name, error.message);
                            if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                        });
                    };
                    audioPlayer.addEventListener('canplaythrough', playWhenReady, { once: true });
                    audioPlayer.addEventListener('error', (e) => {
                         handleAudioPlayerError(e);
                         audioPlayer.removeEventListener('canplaythrough', playWhenReady);
                    }, { once: true });
                }
            } else { 
                audioPlayer.pause();
            }
        });
    }
    
    function handleAudioPlayerError(e) {
        console.error("[Main Player] Error event on audioPlayer:", e);
        if (audioPlayer && audioPlayer.error) {
            console.error("Error details:", audioPlayer.error.message, "Code:", audioPlayer.error.code);
        }
        if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        stopBreathingAnimation(); 
    }

    if (audioPlayer && durationEl) {
        audioPlayer.addEventListener('loadedmetadata', () => {
            if (durationEl) durationEl.textContent = formatTime(audioPlayer.duration);
            updateProgress(); 
            if (playerControlsDiv && (audioPlayer.src || audioPlayer.currentSrc) ) playerControlsDiv.style.display = '';
            if (playerActionsDiv && (audioPlayer.src || audioPlayer.currentSrc) ) playerActionsDiv.style.display = 'flex';
        });
    }

    if (audioPlayer) {
        audioPlayer.addEventListener('timeupdate', updateProgress);
        audioPlayer.addEventListener('play', () => {
            if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            // Start breathing animation only if on a page with meditation player and not home page's default
            if (document.getElementById('meditate')) { 
                 startBreathingAnimation();
            }
            if (userInteracted) setupAudioContext(); 
        });
        audioPlayer.addEventListener('pause', () => { 
            if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            if (document.getElementById('meditate')) {
                stopBreathingAnimation();
            }
            if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
            isVisualizing = false; 
            if(ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
        audioPlayer.addEventListener('ended', () => {
            if (progressBar) progressBar.style.width = '0%';
            if (currentTimeEl) currentTimeEl.textContent = formatTime(0);
        });
        audioPlayer.addEventListener('error', handleAudioPlayerError);

        if ((audioPlayer.src || audioPlayer.currentSrc) && document.getElementById('meditate')) {
            if (playerControlsDiv) playerControlsDiv.style.display = '';
            if (playerActionsDiv) playerActionsDiv.style.display = 'flex';
        } else if (!document.getElementById('meditate')) { // e.g. home.html
            if (playerControlsDiv) playerControlsDiv.style.display = 'none';
            if (playerActionsDiv) playerActionsDiv.style.display = 'none';
        }
    }

    function loadAndPlayAudio(audioSrc, title, durationStr, instructor, loop = false) {
        if (!audioPlayer || !sessionTitle || !sessionDetails || !durationEl || !currentTimeEl || !progressBar || !playPauseBtn) {
            console.error("Player elements missing for loadAndPlayAudio");
            return;
        }

        if (!userInteracted) handleFirstUserInteraction({type: 'audioLoad'});

        audioPlayer.src = audioSrc;
        audioPlayer.loop = loop; 
        
        sessionTitle.textContent = title;
        sessionDetails.textContent = `${durationStr} • ${instructor}`;
        durationEl.textContent = loop ? formatTime(Infinity) : durationStr; // Display stated duration or infinity for loops
        
        audioPlayer.currentTime = 0;
        progressBar.style.width = '0%';
        currentTimeEl.textContent = formatTime(0);
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; // Reset button
        
        audioPlayer.load(); 
        const playPromise = audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error("[Audio Load] Autoplay FAILED:", error.name, error.message);
                if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            });
        }
        if (playerControlsDiv) playerControlsDiv.style.display = '';
        if (playerActionsDiv) playerActionsDiv.style.display = 'flex';

        const meditateSection = document.querySelector('#meditate') || document.querySelector('.meditation-player-section');
        if (meditateSection && window.getComputedStyle(meditateSection).display !== 'none') { // Check if section is visible
             // Scroll only if player is not already in viewport
            const playerRect = meditateSection.getBoundingClientRect();
            if (playerRect.bottom < 0 || playerRect.top > window.innerHeight) {
                meditateSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    // --- GLOBAL LANGUAGE TOGGLE LOGIC ---
    const globalLangBtns = document.querySelectorAll('.lang-global-btn');
    let currentGlobalLang = 'en';

    function setGlobalLanguage(lang) {
        currentGlobalLang = lang;
        // Update global toggle UI
        globalLangBtns.forEach(btn => {
            if (btn.dataset.lang === lang) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        // If a session is active, reload its audio in new language
        const activeSession = document.querySelector('.session-item.active');
        if (activeSession) {
            const audioSrc = activeSession.getAttribute(`data-audio-${lang}`) || activeSession.getAttribute('data-audio-en');
            const title = activeSession.getAttribute('data-title');
            const duration = activeSession.getAttribute('data-duration');
            const instructor = activeSession.getAttribute('data-instructor');
            loadAndPlayAudio(audioSrc, title, duration, instructor, false);
        }
    }

    if (globalLangBtns.length) {
        globalLangBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                setGlobalLanguage(this.dataset.lang);
            });
        });
    }

    // --- SESSION ITEM LOGIC (NO PER-SESSION LANGUAGE BUTTONS) ---
    if (sessionItems.length > 0) {
        sessionItems.forEach(item => {
            // Session item click (play)
            item.addEventListener('click', function(e) {
                sessionItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');

                const lang = currentGlobalLang; // Use global language
                const audioSrc = this.getAttribute(`data-audio-${lang}`) || this.getAttribute('data-audio-en');
                const title = this.getAttribute('data-title');
                const duration = this.getAttribute('data-duration');
                const instructor = this.getAttribute('data-instructor');

                loadAndPlayAudio(audioSrc, title, duration, instructor, false);
            });
        });

        // On page load, set player UI to the active session and selected language
        if (document.getElementById('meditate')) {
            const activeSession = document.querySelector('.session-item.active');
            if (activeSession && (!audioPlayer.src || !audioPlayer.currentSrc)) {
                // Use global language
                const lang = currentGlobalLang;
                const title = activeSession.getAttribute('data-title');
                const duration = activeSession.getAttribute('data-duration');
                const instructor = activeSession.getAttribute('data-instructor');
                const audioSrc = activeSession.getAttribute(`data-audio-${lang}`) || activeSession.getAttribute('data-audio-en');

                if (sessionTitle) sessionTitle.textContent = title;
                if (sessionDetails) sessionDetails.textContent = `${duration} • ${instructor}`;
                if (durationEl) durationEl.textContent = duration;
                if (audioPlayer) audioPlayer.src = audioSrc;

                if (playerControlsDiv) playerControlsDiv.style.display = '';
                if (playerActionsDiv) playerActionsDiv.style.display = 'flex';
            }
        }
    }

    if (soundCards.length > 0) {
        soundCards.forEach(card => {
            card.addEventListener('click', function() {
                const soundType = this.getAttribute('data-sound');
                let audioSrc, title;
                
                switch(soundType) {
                    case 'rain': 
                        audioSrc = 'assets/audio/rain.mp3'; 
                        title = 'Rain Sounds';
                        break;
                    case 'wind': 
                        audioSrc = 'assets/audio/wind.mp3'; 
                        title = 'Wind Sounds';
                        break;
                    case 'fire': 
                        audioSrc = 'assets/audio/fire.mp3'; 
                        title = 'Fireplace Sounds';
                        break;
                    case 'white-noise': 
                        audioSrc = 'assets/audio/forest.mp3'; 
                        title = 'forest';
                        break;
                    default: 
                        audioSrc = 'assets/audio/music.mp3';
                        title = 'Ambient Sound';
                }
                loadAndPlayAudio(audioSrc, title, 'Continuous', 'Natural Sounds', true);
            });
        });
    }

    if (sleepPlayBtns.length > 0) {
        sleepPlayBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const card = this.closest('.sleep-card');
                if (!card) return;

                const audioSrc = card.getAttribute('data-audio');
                const title = card.getAttribute('data-title');
                const duration = card.getAttribute('data-duration');
                const instructor = card.getAttribute('data-instructor');
                const loop = card.getAttribute('data-loop') === 'true';

                loadAndPlayAudio(audioSrc, title, duration, instructor, loop);
            });
        });
    }

    // Visualizer setup
    window.audioContext = null; 
    let analyser, dataArray, sourceNode, animationFrameId;
    let isVisualizing = false;
    const canvas = document.getElementById('visualizer');
    let ctx;

    if (canvas) {
        ctx = canvas.getContext('2d');
        function resizeCanvas() { 
            if(canvas && ctx) { 
                const playerVisualization = canvas.closest('.player-visualization');
                if (playerVisualization) {
                    canvas.width = playerVisualization.offsetWidth; 
                    canvas.height = playerVisualization.offsetHeight;
                } else {
                    canvas.width = canvas.offsetWidth;
                    canvas.height = canvas.offsetHeight;
                }
            }
        }
        resizeCanvas(); 
        window.addEventListener('resize', resizeCanvas); 
    }
    
    function setupAudioContext() {
        if (!audioPlayer || !canvas || !userInteracted) return; 

        if (!window.audioContext) {
            try {
                window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error("Error CREATING AudioContext:", e); return;
            }
        }

        if (window.audioContext.state === 'suspended') {
            window.audioContext.resume().catch(e => console.error("Error RESUMING AudioContext in setup:", e));
        }

        if (!sourceNode || sourceNode.mediaElement !== audioPlayer) {
            if (sourceNode) { try { sourceNode.disconnect(); } catch(e){} }
            try {
                sourceNode = window.audioContext.createMediaElementSource(audioPlayer);
            } catch (e) {
                console.error("Error CREATING MediaElementSourceNode:", e);
                isVisualizing = false; if (animationFrameId) cancelAnimationFrame(animationFrameId); return; 
            }
        }
        
        if (!analyser) {
            analyser = window.audioContext.createAnalyser();
            analyser.fftSize = 256; 
        }
        
        try {
            sourceNode.disconnect(analyser); // Disconnect previous if any
            analyser.disconnect(window.audioContext.destination); // Disconnect previous if any
        } catch(e) { /* ignore if not connected */ }

        sourceNode.connect(analyser);
        analyser.connect(window.audioContext.destination);
        
        dataArray = new Uint8Array(analyser.frequencyBinCount); 
        isVisualizing = true;
        if (animationFrameId) cancelAnimationFrame(animationFrameId); 
        visualize();
    }

    function visualize() {
        if (!isVisualizing || !analyser || !ctx || !canvas || !dataArray || !window.audioContext || window.audioContext.state !== 'running') {
            if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
            if (ctx && canvas && isVisualizing) ctx.clearRect(0, 0, canvas.width, canvas.height); 
            isVisualizing = false; 
            return;
        }
        
        animationFrameId = requestAnimationFrame(visualize);
        analyser.getByteFrequencyData(dataArray); 
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / (dataArray.length * 0.8)) * 1.2;
        let x = 0;
        const numBars = dataArray.length * 0.8; 
        
        for (let i = 0; i < numBars; i++) {
            const barHeight = dataArray[i] * (canvas.height / 256) * 0.8; 
            const hue = i * (360 / numBars); 
            ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.6)`; 
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 2; 
        }
    }
    
    // Breathing Animation
    let breathingInterval;
    let breathCycleState = 'in'; 
    let breathTimer = 0;
    const inhaleTime = 4; 
    const exhaleTime = 4; 

    function updateBreathingAnimation() {
        if (!breathingInstruction) return;
        const circles = document.querySelectorAll('.breathing-animation .circle');
        if (!circles.length) return;

        breathTimer++;
        let scaleFactor, opacityFactor;

        switch (breathCycleState) {
            case 'in':
                breathingInstruction.textContent = "Breathe In";
                scaleFactor = 0.8 + 0.4 * (breathTimer / inhaleTime);
                opacityFactor = 0.3 + 0.5 * (breathTimer / inhaleTime);
                if (breathTimer >= inhaleTime) { breathCycleState = 'out'; breathTimer = 0; }
                break;
            case 'out':
                breathingInstruction.textContent = "Breathe Out";
                scaleFactor = 1.2 - 0.4 * (breathTimer / exhaleTime);
                opacityFactor = 0.8 - 0.5 * (breathTimer / exhaleTime);
                if (breathTimer >= exhaleTime) { breathCycleState = 'in'; breathTimer = 0; }
                break;
        }
        circles.forEach(c => {
            c.style.transform = `scale(${Math.max(0.1, Math.min(1.5, scaleFactor))})`; // Clamp values
            c.style.opacity = `${Math.max(0, Math.min(1, opacityFactor))}`;
        });
    }

    function startBreathingAnimation() {
        if (!breathingInstruction || !document.querySelector('.breathing-animation')) return;
        clearInterval(breathingInterval); 
        breathCycleState = 'in'; 
        breathTimer = 0;
        updateBreathingAnimation(); 
        breathingInterval = setInterval(updateBreathingAnimation, 1000); 
    }

    function stopBreathingAnimation() {
        if (!breathingInstruction || !document.querySelector('.breathing-animation')) return;
        clearInterval(breathingInterval);
    }
    
    // Start breathing animation by default if on home page and no main audio playing
    // Or if on meditation page and main audio starts (handled in audioPlayer.onplay)
    if (breathingInstruction && document.getElementById('home') && (!document.getElementById('meditate'))) { // Only on home.html and not on meditate.html
        if (!audioPlayer || audioPlayer.paused) {
            startBreathingAnimation();
        }
    }


    // Volume Controls
    const volumeSlider = document.getElementById('volume');
    const volumeBtn = document.getElementById('volume-btn');

    if (volumeSlider && audioPlayer && volumeBtn) {
        audioPlayer.volume = parseFloat(volumeSlider.value);
        volumeSlider.addEventListener('input', () => {
            audioPlayer.volume = volumeSlider.value;
            updateVolumeIcon(volumeSlider.value);
        });
        volumeBtn.addEventListener('click', () => {
            audioPlayer.muted = !audioPlayer.muted;
            updateVolumeIcon(audioPlayer.muted ? 0 : audioPlayer.volume);
            volumeSlider.value = audioPlayer.muted ? 0 : audioPlayer.volume;
        });
        function updateVolumeIcon(volume) {
            if (audioPlayer.muted || volume == 0) {
                volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            } else if (volume < 0.5) {
                volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
            } else {
                volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        }
        updateVolumeIcon(audioPlayer.volume);
    }

    // Rewind and Forward Buttons
    const rewindBtn = document.getElementById('rewind');
    const forwardBtn = document.getElementById('forward');

    if (rewindBtn && audioPlayer) {
        rewindBtn.addEventListener('click', () => {
            audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
        });
    }
    if (forwardBtn && audioPlayer) {
        forwardBtn.addEventListener('click', () => {
            if (audioPlayer.duration && !isNaN(audioPlayer.duration) && audioPlayer.duration !== Infinity) {
                audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 10);
            } else if (audioPlayer.duration === Infinity) { // For live streams or infinite loops, maybe do nothing or give feedback
                // Potentially do nothing for infinite streams
            }
        });
    }

    // Stats Counter (for home.html)
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length > 0 && typeof $.fn.waypoint !== 'undefined' && document.querySelector('.stats-section')) {
        const statsSection = document.querySelector('.stats-section');
        if (statsSection) { // Ensure we are on a page with stats section
            new Waypoint({
                element: statsSection,
                handler: function() {
                    statNumbers.forEach(stat => {
                        const countTo = parseFloat(stat.getAttribute('data-count'));
                        const suffix = stat.getAttribute('data-suffix') || '';
                        let current = 0;
                        const increment = countTo / 100;

                        const updateCount = () => {
                            current += increment;
                            if (current < countTo) {
                                stat.textContent = (countTo % 1 !== 0 ? current.toFixed(1) : Math.ceil(current)) + suffix;
                                requestAnimationFrame(updateCount);
                            } else {
                                stat.textContent = countTo + suffix;
                            }
                        };
                        updateCount();
                    });
                    this.destroy(); 
                },
                offset: '80%' 
            });
        }
    }


        // --- TIMER MODAL LOGIC ---
    (function() {
        let timerInterval = null;
        let totalSeconds = 300; // default 5 min
        let remainingSeconds = totalSeconds;
        let timerRunning = false;
        let alarmEnabled = false;
        const minutesEl = document.getElementById('timer-minutes');
        const secondsEl = document.getElementById('timer-seconds');
        const startBtn = document.getElementById('start-timer-modal-btn');
        const stopBtn = document.getElementById('stop-timer-modal-btn');
        const statusEl = document.getElementById('timer-status');
        const timerModal = document.getElementById('timerModal');
        const alarmCheckbox = document.getElementById('timer-alarm-checkbox');
        const floatingDisplay = document.getElementById('floating-timer-display');
        const floatingBtn = document.getElementById('floating-timer-btn');
        let bsModal = null;
        if (window.bootstrap && timerModal) bsModal = bootstrap.Modal.getOrCreateInstance(timerModal);

        function updateDisplay() {
            const mins = Math.floor(remainingSeconds / 60);
            const secs = remainingSeconds % 60;
            if (minutesEl) minutesEl.textContent = (mins < 10 ? '0' : '') + mins;
            if (secondsEl) secondsEl.textContent = (secs < 10 ? '0' : '') + secs;
            if (timerRunning && floatingDisplay) {
                floatingDisplay.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
                floatingDisplay.style.display = 'block';
            } else if (floatingDisplay) {
                floatingDisplay.style.display = 'none';
            }
        }
        function setTimer(seconds) {
            remainingSeconds = Math.max(0, Math.min(3600, seconds));
            updateDisplay();
        }
        function changeTimer(delta) {
            setTimer(remainingSeconds + delta);
        }
        function startTimer() {
            if (timerRunning || remainingSeconds <= 0) return;
            timerRunning = true;
            if (startBtn) startBtn.classList.add('d-none');
            if (stopBtn) stopBtn.classList.remove('d-none');
            if (statusEl) statusEl.textContent = '';
            updateDisplay();
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                if (remainingSeconds > 0) {
                    remainingSeconds--;
                    updateDisplay();
                } else {
                    stopTimer(true);
                }
            }, 1000);
        }
        function stopTimer(finished) {
            timerRunning = false;
            if (timerInterval) clearInterval(timerInterval);
            if (startBtn) startBtn.classList.remove('d-none');
            if (stopBtn) stopBtn.classList.add('d-none');
            if (floatingDisplay) floatingDisplay.style.display = 'none';
            if (finished) {
                if (statusEl) statusEl.textContent = 'Time is up!';
                if (alarmEnabled) {
                    // Try to play a sound or show a notification
                    if (window.Notification && Notification.permission === 'granted') {
                        new Notification('Meditation Timer', { body: 'Time is up!' });
                    } else if (window.Notification && Notification.permission !== 'denied') {
                        Notification.requestPermission().then(function (permission) {
                            if (permission === 'granted') {
                                new Notification('Meditation Timer', { body: 'Time is up!' });
                            }
                        });
                    }
                    // Fallback: beep
                    try {
                        const beep = new Audio('https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae7b2.mp3');
                        beep.play();
                    } catch(e) {}
                }
                setTimeout(() => {
                    if (bsModal) bsModal.hide();
                    if (statusEl) statusEl.textContent = '';
                }, 1200);
            } else {
                if (statusEl) statusEl.textContent = '';
            }
            // Reset timer only if finished, otherwise keep last set value
            if (finished) setTimer(totalSeconds);
        }
        // Button events
        document.querySelectorAll('.timer-btn').forEach(btn => {
            btn.onclick = function() {
                const delta = parseInt(this.getAttribute('data-change'), 10) * 60;
                changeTimer(delta);
            };
        });
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.onclick = function() {
                const mins = parseInt(this.getAttribute('data-minutes'), 10);
                setTimer(mins * 60);
            };
        });
        if (alarmCheckbox) alarmCheckbox.onchange = function() {
            alarmEnabled = alarmCheckbox.checked;
        };
        if (startBtn) startBtn.onclick = function() {
            if (remainingSeconds <= 0) {
                if (statusEl) statusEl.textContent = 'Set a valid time!';
                return;
            }
            totalSeconds = remainingSeconds;
            alarmEnabled = alarmCheckbox && alarmCheckbox.checked;
            startTimer();
            if (bsModal) bsModal.hide(); // Hide modal after starting
        };
        if (stopBtn) stopBtn.onclick = function() {
            stopTimer(false);
        };
        if (timerModal) {
            timerModal.addEventListener('show.bs.modal', function() {
                // Don't stop timer, just update modal display
                setTimer(remainingSeconds);
                if (alarmCheckbox) alarmCheckbox.checked = alarmEnabled;
                if (timerRunning) {
                    startBtn.classList.add('d-none');
                    stopBtn.classList.remove('d-none');
                } else {
                    startBtn.classList.remove('d-none');
                    stopBtn.classList.add('d-none');
                }
            });
            timerModal.addEventListener('hidden.bs.modal', function() {
                // Don't stop timer, just hide modal
                if (timerRunning && floatingDisplay) floatingDisplay.style.display = 'block';
            });
        }
        // Hide floating display if modal is opened
        if (floatingBtn && floatingDisplay) {
            floatingBtn.addEventListener('click', function() {
                if (timerRunning) floatingDisplay.style.display = 'block';
            });
        }
        // Initialize
        setTimer(totalSeconds);
    })();

    // --- END OF TIMER MODAL LOGIC ---


    // Form Validations
    const newsletterFormHome = document.getElementById('newsletter-form'); // home.html
    const newsletterFormMeditation = document.getElementById('newsletter-form-meditation'); // meditation.html

    function handleNewsletterSubmit(formElement, emailId, privacyId) {
        if (!formElement) return;
        formElement.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = document.getElementById(emailId);
            const privacyCheck = document.getElementById(privacyId);
            if (!emailInput || !privacyCheck) return;

            if (!emailInput.value || !emailInput.checkValidity()) {
                alert("Please enter a valid email address.");
                emailInput.focus();
                return;
            }
            if (!privacyCheck.checked) {
                alert("Please agree to the privacy policy.");
                privacyCheck.focus();
                return;
            }
            alert("Thank you for subscribing!");
            this.reset();
        });
    }
    handleNewsletterSubmit(newsletterFormHome, 'newsletter-email', 'privacy-check');
    handleNewsletterSubmit(newsletterFormMeditation, 'newsletter-email-meditation', 'privacy-check-meditation');


    // Audio Start Overlay Logic (for home.html)
    const audioStartOverlay = document.getElementById('audio-start-overlay');
    const audioStartBtn = document.getElementById('audio-start-btn');
    if (audioStartOverlay && audioStartBtn && bgMusic) { // Only if all three exist
        // Show overlay initially if bgMusic is supposed to autoplay but might be blocked
        if (bgMusic.hasAttribute('autoplay')) {
            // Check if audio is actually playing. If not, show overlay.
            setTimeout(() => { // Give browser a moment to attempt autoplay
                if (bgMusic.paused) {
                    audioStartOverlay.style.display = 'flex';
                } else {
                    audioStartOverlay.style.display = 'none'; // Autoplay worked
                    userInteracted = true; // If autoplay worked, consider it an interaction for other audio
                }
            }, 200);
        } else {
            audioStartOverlay.style.display = 'none'; // No autoplay, no need for overlay
        }

        audioStartBtn.addEventListener('click', function() {
            // Set userInteracted immediately
            if (!userInteracted) handleFirstUserInteraction({type: 'audioStartBtnClick'}); // Critical

            // Try to play bgMusic, and only hide overlay after playback starts
            const playPromise = bgMusic.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    audioStartOverlay.style.display = 'none';
                }).catch((err) => {
                    audioStartOverlay.style.display = 'flex';
                    // Optionally show a message if playback fails
                    // alert("Unable to start background music. Please check your browser settings and allow audio playback.");
                });
            } else {
                // For very old browsers, just hide overlay
                audioStartOverlay.style.display = 'none';
            }
        });
    } else if (audioStartOverlay) { 
        // If overlay exists but no bgMusic or button (e.g. on meditation.html), ensure it's hidden
        audioStartOverlay.style.display = 'none';
    }
});
