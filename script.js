// Canvas interaction and card expansion logic

let isDragging = false;
let startX, startY;
let scrollLeft, scrollTop;
let expandedCard = null;
let hasDragged = false;

// Card dragging variables
let isDraggingCard = false;
let draggedCard = null;
let cardStartX, cardStartY;
let cardInitialLeft, cardInitialTop;

// Cursor trail variables - inspired by guild.ai
let trailElements = [];
const maxTrailElements = 30;
let lastTrailTime = 0;
const trailThrottle = 16; // ~60fps - create trail element every 16ms

// Background geometric shapes - inspired by guild.ai scroll effect
let lastScrollLeft = 0;
let lastScrollTop = 0;
let shapeSpawnThrottle = 150; // Spawn shape every 150ms of scrolling
let lastShapeTime = 0;
const maxShapes = 12;

const canvas = document.getElementById('canvas');
const canvasSpace = document.getElementById('canvasSpace');
const overlay = document.getElementById('overlay');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const cards = document.querySelectorAll('.project-card, .compact-card.project-card');

// ============================================
// CANVAS MOUSE PANNING - Simple implementation
// ============================================

canvas.addEventListener('mousedown', function(e) {
    // Skip if clicking on interactive elements
    if (e.target.closest('.project-card') || 
        e.target.closest('.compact-card') ||
        e.target.closest('.intro-section') ||
        e.target.closest('button') ||
        expandedCard) {
        return;
    }
    
    isDragging = true;
    canvas.style.cursor = 'grabbing';
    canvas.style.scrollBehavior = 'auto'; // Disable smooth scroll during drag
    
    startX = e.pageX;
    startY = e.pageY;
    scrollLeft = canvas.scrollLeft;
    scrollTop = canvas.scrollTop;
});

canvas.addEventListener('mousemove', function(e) {
    // Canvas panning logic
    if (isDragging) {
        e.preventDefault();
        
        const dx = e.pageX - startX;
        const dy = e.pageY - startY;
        
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasDragged = true;
        }
        
        canvas.scrollLeft = scrollLeft - dx;
        canvas.scrollTop = scrollTop - dy;
        return;
    }
    
    // Cursor trail effect - only when not dragging and not over interactive elements
    if (!e.target.closest('.project-card') && 
        !e.target.closest('.compact-card') &&
        !e.target.closest('.intro-section') &&
        !e.target.closest('button')) {
        
        // Throttle trail creation for smoother performance
        const now = Date.now();
        if (now - lastTrailTime < trailThrottle) {
            return;
        }
        lastTrailTime = now;
        
        // Get mouse position relative to viewport
        const x = e.clientX;
        const y = e.clientY;
        
        // Snap to grid (40px grid size)
        const gridSize = 40;
        const snappedX = Math.round(x / gridSize) * gridSize;
        const snappedY = Math.round(y / gridSize) * gridSize;
        
        // Create a new trail element
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        trail.style.left = snappedX + 'px';
        trail.style.top = snappedY + 'px';
        
        document.body.appendChild(trail);
        trailElements.push(trail);
        
        // Limit the number of trail elements
        if (trailElements.length > maxTrailElements) {
            const oldTrail = trailElements.shift();
            if (oldTrail && oldTrail.parentNode) {
                oldTrail.classList.add('fade-out');
                setTimeout(() => {
                    if (oldTrail.parentNode) {
                        oldTrail.parentNode.removeChild(oldTrail);
                    }
                }, 800);
            }
        }
        
        // Trigger fade out animation after a short delay
        setTimeout(() => {
            trail.classList.add('fade-out');
            
            // Remove element after animation completes
            setTimeout(() => {
                if (trail.parentNode) {
                    trail.parentNode.removeChild(trail);
                }
                const index = trailElements.indexOf(trail);
                if (index > -1) {
                    trailElements.splice(index, 1);
                }
            }, 800);
        }, 100);
    }
});

canvas.addEventListener('mouseup', function() {
    isDragging = false;
    canvas.style.cursor = 'grab';
});

canvas.addEventListener('mouseleave', function() {
    isDragging = false;
    canvas.style.cursor = 'grab';
    
    // Clean up trail elements when mouse leaves canvas
    trailElements.forEach(trail => {
        if (trail.parentNode) {
            trail.classList.add('fade-out');
            setTimeout(() => {
                if (trail.parentNode) {
                    trail.parentNode.removeChild(trail);
                }
            }, 800);
        }
    });
    trailElements = [];
});

// ============================================
// CARD DRAGGING
// ============================================

document.addEventListener('mouseup', function() {
    if (isDraggingCard && draggedCard) {
        isDraggingCard = false;
        draggedCard.style.cursor = 'pointer';
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        draggedCard = null;
        // Keep hasDragged true so click handler knows we just dragged
    }
});

document.addEventListener('mousemove', function(e) {
    if (!isDraggingCard || !draggedCard) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - cardStartX;
    const deltaY = e.clientY - cardStartY;
    
    // Mark as dragged if moved more than 5px
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasDragged = true;
    }
    
    // Cards are positioned absolutely within canvas-space
    // Mouse delta directly translates to card position change
    // No need to account for scroll since cards move with the canvas
    draggedCard.style.left = (cardInitialLeft + deltaX) + 'px';
    draggedCard.style.top = (cardInitialTop + deltaY) + 'px';
});

// Card dragging and expansion functionality
cards.forEach(card => {
    // Skip sticky note card - it's fixed position
    
    const cardContent = card.querySelector('.card-content');
    
    // Handle card drag start - entire card is draggable
    card.addEventListener('mousedown', (e) => {
        // Don't start card drag if clicking on buttons or expanded content
        if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('.card-expanded-content')) {
            return;
        }
        
        if (card.classList.contains('expanded') || card.classList.contains('card-detail-open') || card.classList.contains('experiments-open')) {
            return;
        }
        
        e.stopPropagation();
        
        // Reset drag state
        hasDragged = false;
        
        // Start card dragging
        isDraggingCard = true;
        draggedCard = card;
        
        // Store initial mouse position relative to viewport
        cardStartX = e.clientX;
        cardStartY = e.clientY;
        
        // Get current card position from inline styles (relative to canvas-space)
        // Parse the left and top values, defaulting to 0 if not set
        const styleLeft = card.style.left || '';
        const styleTop = card.style.top || '';
        cardInitialLeft = styleLeft ? parseFloat(styleLeft) : 0;
        cardInitialTop = styleTop ? parseFloat(styleTop) : 0;
        
        // Update cursor
        card.style.cursor = 'grabbing';
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    });
    
    // Handle card click - whole card is clickable, expand if we didn't drag
    card.addEventListener('click', (e) => {
        if (e.target.closest('.close-btn') || e.target.closest('.close-btn-square') || e.target.closest('.card-detail-close')) return;

        const isStatBlock = card.classList.contains('stat-block');
        if (!isStatBlock && (card.classList.contains('expanded') || card.classList.contains('card-detail-open'))) return;

        e.stopPropagation();
        setTimeout(() => {
            if (!isDraggingCard && !hasDragged && !isDragging) {
                expandCard(card);
            }
            hasDragged = false;
        }, 10);
    });
});

// Intro section reference (for hiding behind expanded cards)
const introSection = document.querySelector('.intro-section');

// (slide-panel removed -- using in-card detail expansion now)

// ============================================
// EXPERIMENT MINI-CARDS (scatter from +15 card)
// ============================================
let experimentsOpen = false;
let experimentMiniCards = [];
let experimentsParentCard = null;

const experimentItems = [
    { id: 'signup', title: 'Progressive Signup', metricLabel: 'SURVEY COMPLETION', metricValue: '+10%' },
    { id: 'askjasper', title: 'Ask Jasper', metricLabel: 'ASK JASPER USAGE', metricValue: '+22%' },
    { id: 'suggestion', title: 'Suggestion Chip', metricLabel: 'CHAT USAGE', metricValue: '+24%' },
    { id: 'hero', title: 'Get Started Hero', metricLabel: 'FIRST CONTENT GENERATED', metricValue: '+8%' },
    { id: 'zerotoproject', title: 'Zero to Project', metricLabel: 'TIME TO FIRST PROJECT', metricValue: '-32%' },
];

function toggleExperiments(card) {
    if (experimentsOpen) {
        collapseExperiments();
        return;
    }

    experimentsParentCard = card;
    card.classList.add('experiments-open');

    const cardLeft = card.offsetLeft;
    const cardTop = card.offsetTop;
    const cardW = card.offsetWidth;
    const cardH = card.offsetHeight;
    const startX = cardLeft + cardW / 2;
    const startY = cardTop + cardH / 2;

    const gap = 12;
    const miniCardHeight = 80;
    const columnX = cardLeft + cardW + 16;
    const columnStartY = cardTop;

    experimentItems.forEach((item, i) => {
        const el = document.createElement('div');
        el.className = 'experiment-mini-card';
        el.dataset.experiment = item.id;

        el.style.setProperty('--mini-rotation', '0deg');

        el.innerHTML =
            '<div class="mini-card-title">' + item.title + '</div>' +
            '<div class="mini-card-metric">' +
                '<span class="mini-metric-value">' + item.metricValue + '</span>' +
                '<span class="mini-metric-label">' + item.metricLabel + '</span>' +
            '</div>';

        const targetX = columnX;
        const targetY = columnStartY + i * (miniCardHeight + gap);

        el.style.left = startX + 'px';
        el.style.top = startY + 'px';

        canvasSpace.appendChild(el);

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (el.classList.contains('expanded')) return;
            expandExperimentCard(el, item.id);
        });
        el.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        experimentMiniCards.push(el);

        setTimeout(() => {
            el.style.left = targetX + 'px';
            el.style.top = targetY + 'px';
            el.classList.add('visible');
        }, 50 + i * 60);
    });

    experimentsOpen = true;
}

function collapseExperiments() {
    if (!experimentsOpen) return;

    collapseExperimentCard();

    if (experimentsParentCard) {
        const centerX = experimentsParentCard.offsetLeft + experimentsParentCard.offsetWidth / 2;
        const centerY = experimentsParentCard.offsetTop + experimentsParentCard.offsetHeight / 2;

        experimentMiniCards.forEach((el, i) => {
            el.classList.remove('visible', 'expanded');
            el.classList.add('collapsing');
            el.style.left = centerX + 'px';
            el.style.top = centerY + 'px';
        });

        setTimeout(() => {
            experimentMiniCards.forEach(el => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            experimentMiniCards = [];
        }, 400);

        experimentsParentCard.classList.remove('experiments-open');
        experimentsParentCard = null;
    }

    experimentsOpen = false;
}

let expandedMiniCard = null;

function expandExperimentCard(miniCardEl, panelId) {
    if (expandedMiniCard) {
        collapseExperimentCard();
    }

    if (!experimentsParentCard) return;
    const expandedContent = experimentsParentCard.querySelector('.card-expanded-content');
    if (!expandedContent) return;

    const panel = expandedContent.querySelector('.experiment-panel[data-panel="' + panelId + '"]');
    if (!panel) return;

    const clonedPanel = panel.cloneNode(true);
    clonedPanel.classList.add('active');

    const wrapper = document.createElement('div');
    wrapper.className = 'expanded-experiment-content';

    const closeBar = document.createElement('div');
    closeBar.className = 'expanded-experiment-close';
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        collapseExperimentCard();
    });
    closeBar.appendChild(closeBtn);

    wrapper.appendChild(closeBar);
    wrapper.appendChild(clonedPanel);

    miniCardEl.appendChild(wrapper);
    miniCardEl.classList.add('expanded');

    expandedMiniCard = miniCardEl;

    const videos = wrapper.querySelectorAll('video');
    videos.forEach(v => { v.play().catch(() => {}); });
}

function collapseExperimentCard() {
    if (!expandedMiniCard) return;

    const content = expandedMiniCard.querySelector('.expanded-experiment-content');
    if (content) content.remove();

    expandedMiniCard.classList.remove('expanded');
    expandedMiniCard = null;
}

function expandCard(card) {
    if (expandedCard) {
        closeExpandedCard();
    }

    const isProjectCard = card.hasAttribute('data-project');
    const isStatBlock = card.classList.contains('stat-block');

    if (isStatBlock) {
        toggleExperiments(card);
    } else if (isProjectCard) {
        const slidePanelBody = card.querySelector('.slide-panel-body');
        if (!slidePanelBody) return;

        const bullets = slidePanelBody.querySelector('.modal-bullets');
        if (!bullets) return;

        const detailBody = document.createElement('div');
        detailBody.className = 'card-detail-body';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'card-detail-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeExpandedCard();
        });

        const clonedBullets = bullets.cloneNode(true);

        const cta = document.createElement('div');
        cta.className = 'card-detail-cta';
        cta.textContent = 'Case study coming soon';

        detailBody.appendChild(closeBtn);
        detailBody.appendChild(clonedBullets);
        detailBody.appendChild(cta);

        card.appendChild(detailBody);
        card.classList.add('card-detail-open');
        expandedCard = card;
    } else {
        const expandedContent = card.querySelector('.card-expanded-content');
        if (!expandedContent) return;

        const clonedContent = expandedContent.cloneNode(true);
        modalContent.innerHTML = '';
        modalContent.appendChild(clonedContent);

        const closeBtn = modalContent.querySelector('.close-btn') || modalContent.querySelector('.close-btn-square');
        if (closeBtn) {
            closeBtn.onclick = closeExpandedCard;
        }

        if (introSection) {
            introSection.classList.add('hidden-behind');
        }

        modal.classList.add('active');
        overlay.classList.add('active');
        expandedCard = card;

        canvas.style.overflow = 'hidden';

        if (modalContent.querySelector('.archive-layout')) {
            initArchiveInteractions();
        }
    }
}

function closeExpandedCard() {
    if (!expandedCard) return;

    if (expandedCard.classList.contains('card-detail-open')) {
        const detailBody = expandedCard.querySelector('.card-detail-body');
        if (detailBody) detailBody.remove();
        expandedCard.classList.remove('card-detail-open');
    } else {
        modal.classList.remove('active');
        overlay.classList.remove('active');
        modalContent.innerHTML = '';
        canvas.style.overflow = 'auto';
    }

    if (introSection) {
        introSection.classList.remove('hidden-behind');
    }

    expandedCard = null;
}

function closeModal() {
    closeExpandedCard();
}

function closeCard(closeButton) {
    closeExpandedCard();
}

function closeSlidePanel() {
    // Legacy stub -- slide panels no longer used
}

overlay.addEventListener('click', () => {
    if (expandedCard) {
        closeExpandedCard();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (expandedMiniCard) {
            collapseExperimentCard();
            return;
        }
        if (experimentsOpen) {
            collapseExperiments();
        }
        if (expandedCard) {
            closeExpandedCard();
        }
    }
});

// Prevent card expansion when clicking inside expanded content or slide panel
cards.forEach(card => {
    const expandedContent = card.querySelector('.card-expanded-content');
    if (expandedContent) {
        expandedContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
});

// Close in-card detail, experiments, or expanded mini-card when clicking on canvas background
canvas.addEventListener('click', (e) => {
    if (expandedMiniCard && !e.target.closest('.experiment-mini-card')) {
        collapseExperimentCard();
        return;
    }
    if (experimentsOpen) {
        if (!e.target.closest('.project-card') && !e.target.closest('.experiment-mini-card')) {
            collapseExperiments();
        }
    }
    if (expandedCard && expandedCard.classList.contains('card-detail-open')) {
        if (!e.target.closest('.project-card')) {
            closeExpandedCard();
        }
    }
});

// Don't use smooth scroll - it interferes with mouse drag panning
canvas.style.scrollBehavior = 'auto';

// Anchor page to top when first loaded
window.addEventListener('load', () => {
    if (!canvasSpace) return;
    
    // Set scroll position to top-left (0, 0)
    canvas.scrollLeft = 0;
    canvas.scrollTop = 0;
    
    // Small delay to ensure scroll position is set before animation
    setTimeout(() => {
        // Animate cards appearing one by one
        animateCardsEntrance();
    }, 50);
});

// Animate cards appearing one by one with staggered delays
function animateCardsEntrance() {
    // Intro section animates via CSS, no JS needed
    
    // Animate project cards and compact cards
    const allCards = document.querySelectorAll('.project-card, .compact-card');
    
    allCards.forEach((card, index) => {
        // Stagger the animation with increasing delays
        const delay = 200 + (index * 150);
        
        setTimeout(() => {
            card.classList.add('card-visible');
        }, delay);
    });
}

// Matrix effect for stat number on hover
const statCard = document.querySelector('.compact-card.stat-block');
const statNumber = document.querySelector('.stat-number');

if (statCard && statNumber) {
    let matrixInterval = null;
    
    statCard.addEventListener('mouseenter', () => {
        const originalText = statNumber.textContent;
        let elapsed = 0;
        const duration = 1000; // 1 second (shorter)
        const updateInterval = 50; // Update every 50ms for smooth effect
        
        // Characters to use for matrix effect: digits, letters, and + sign
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ+';
        
        matrixInterval = setInterval(() => {
            elapsed += updateInterval;
            
            // Generate random 3-character string mixing digits, letters, and + sign
            const char1 = chars[Math.floor(Math.random() * chars.length)];
            const char2 = chars[Math.floor(Math.random() * chars.length)];
            const char3 = chars[Math.floor(Math.random() * chars.length)];
            statNumber.textContent = `${char1}${char2}${char3}`;
            
            if (elapsed >= duration) {
                clearInterval(matrixInterval);
                statNumber.textContent = originalText; // Restore original
            }
        }, updateInterval);
    });
    
    statCard.addEventListener('mouseleave', () => {
        if (matrixInterval) {
            clearInterval(matrixInterval);
            statNumber.textContent = '+15'; // Restore original on leave
        }
    });
}

// ============================================
// BACKGROUND GEOMETRIC SHAPES - Guild.ai inspired
// ============================================

const shapePatterns = [
    // L-shape
    [[0,0], [0,1], [0,2], [1,2]],
    // Reverse L
    [[0,0], [0,1], [0,2], [-1,2]],
    // T-shape
    [[0,0], [-1,0], [1,0], [0,1]],
    // Square
    [[0,0], [1,0], [0,1], [1,1]],
    // Line horizontal
    [[0,0], [1,0], [2,0], [3,0]],
    // Line vertical
    [[0,0], [0,1], [0,2], [0,3]],
    // Z-shape
    [[0,0], [1,0], [1,1], [2,1]],
    // S-shape
    [[1,0], [2,0], [0,1], [1,1]],
    // Plus
    [[0,1], [1,0], [1,1], [1,2], [2,1]],
    // Small square
    [[0,0], [1,0]],
    // Corner
    [[0,0], [1,0], [0,1]],
];

function createGeometricShape() {
    const canvasSpace = document.getElementById('canvasSpace');
    if (!canvasSpace) return;
    
    const gridSize = 40;
    const pattern = shapePatterns[Math.floor(Math.random() * shapePatterns.length)];
    
    // Random position within visible area + some buffer
    const canvas = document.getElementById('canvas');
    const viewportWidth = canvas.clientWidth;
    const viewportHeight = canvas.clientHeight;
    const scrollX = canvas.scrollLeft;
    const scrollY = canvas.scrollTop;
    
    // Spawn within viewport with padding
    const baseX = scrollX + Math.random() * viewportWidth;
    const baseY = scrollY + Math.random() * viewportHeight;
    
    // Snap to grid
    const snappedX = Math.round(baseX / gridSize) * gridSize;
    const snappedY = Math.round(baseY / gridSize) * gridSize;
    
    // Create container for the shape
    const shapeContainer = document.createElement('div');
    shapeContainer.className = 'geo-shape';
    shapeContainer.style.left = snappedX + 'px';
    shapeContainer.style.top = snappedY + 'px';
    
    // Random opacity variation
    const opacity = 0.08 + Math.random() * 0.12;
    
    // Create each block of the pattern
    pattern.forEach(([dx, dy], index) => {
        const block = document.createElement('div');
        block.className = 'geo-block';
        block.style.left = (dx * gridSize) + 'px';
        block.style.top = (dy * gridSize) + 'px';
        block.style.width = gridSize + 'px';
        block.style.height = gridSize + 'px';
        block.style.opacity = opacity;
        block.style.animationDelay = (index * 50) + 'ms';
        shapeContainer.appendChild(block);
    });
    
    canvasSpace.appendChild(shapeContainer);
    
    // Trigger fade in
    requestAnimationFrame(() => {
        shapeContainer.classList.add('visible');
    });
    
    // Fade out and remove after random duration
    const lifetime = 2000 + Math.random() * 3000;
    setTimeout(() => {
        shapeContainer.classList.add('fade-out');
        setTimeout(() => {
            if (shapeContainer.parentNode) {
                shapeContainer.parentNode.removeChild(shapeContainer);
            }
        }, 1500);
    }, lifetime);
}

// Spawn shapes on scroll
if (canvas) {
    canvas.addEventListener('scroll', () => {
        const now = Date.now();
        const scrollX = canvas.scrollLeft;
        const scrollY = canvas.scrollTop;
        
        // Calculate scroll delta
        const deltaX = Math.abs(scrollX - lastScrollLeft);
        const deltaY = Math.abs(scrollY - lastScrollTop);
        const scrollDelta = deltaX + deltaY;
        
        // Only spawn if scrolling significantly and throttled
        if (scrollDelta > 20 && now - lastShapeTime > shapeSpawnThrottle) {
            // Limit number of shapes
            const existingShapes = document.querySelectorAll('.geo-shape');
            if (existingShapes.length < maxShapes) {
                createGeometricShape();
                lastShapeTime = now;
            }
        }
        
        lastScrollLeft = scrollX;
        lastScrollTop = scrollY;
    });
    
    // Also spawn a few shapes initially
    setTimeout(() => {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => createGeometricShape(), i * 300);
        }
    }, 500);
}


// ============================================
// ARCHIVE / EXPERIMENTS INTERACTION
// ============================================

const experimentsData = {
    'Sign up flow': {
        title: 'Sign up flow',
        status: 'WINNER',
        statusClass: 'win',
        metric: '+12% Conversion',
        variantA: 'Control',
        variantB: 'Variant B'
    },
    'Ask Jasper': {
        title: 'Ask Jasper',
        status: 'WINNER',
        statusClass: 'win',
        metric: '+8% Engagement',
        variantA: 'Control',
        variantB: 'Variant B'
    },
    'Suggestion Chip': {
        title: 'Suggestion Chip',
        status: 'WINNER',
        statusClass: 'win',
        metric: '+15% Click-through',
        variantA: 'Control',
        variantB: 'Variant B'
    },
    'Get started hero': {
        title: 'Get started hero',
        status: 'WINNER',
        statusClass: 'win',
        metric: '+10% Activation',
        variantA: 'Control',
        variantB: 'Variant B'
    },
    'Zero to Project': {
        title: 'Zero to Project',
        status: 'WINNER',
        statusClass: 'win',
        metric: '+18% Completion',
        variantA: 'Control',
        variantB: 'Variant B'
    }
};

function initArchiveInteractions() {
    const folderItems = document.querySelectorAll('.modal-content .folder-item');
    const contentArea = document.querySelector('.modal-content .archive-content');
    
    if (!contentArea) return;
    
    // Make sure first folder and panel are active on modal open
    const allPanels = contentArea.querySelectorAll('.experiment-panel');
    const firstFolder = folderItems[0];
    const firstPanel = allPanels[0];
    
    // Reset all to inactive, then activate first
    folderItems.forEach(f => f.classList.remove('active'));
    allPanels.forEach(p => p.classList.remove('active'));
    
    if (firstFolder) firstFolder.classList.add('active');
    if (firstPanel) firstPanel.classList.add('active');
    
    // Set up click handlers for folder switching
    folderItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Update folder active states
            folderItems.forEach(f => f.classList.remove('active'));
            item.classList.add('active');
            
            // Get experiment ID from data attribute
            const experimentId = item.getAttribute('data-experiment');
            
            // Update experiment panel visibility
            allPanels.forEach(panel => panel.classList.remove('active'));
            
            const targetPanel = contentArea.querySelector(`.experiment-panel[data-panel="${experimentId}"]`);
            if (targetPanel) {
                targetPanel.classList.add('active');
                
                // Restart any videos in the panel
                const videos = targetPanel.querySelectorAll('video');
                videos.forEach(video => {
                    video.currentTime = 0;
                    video.play().catch(() => {});
                });
            }
        });
    });
}

// ============================================
// SCRAMBLE TEXT EFFECT ON HOVER
// ============================================

const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

document.querySelectorAll('.project-card').forEach(card => {
    const scrambleElements = card.querySelectorAll('.scramble-text');
    
    scrambleElements.forEach(el => {
        const originalText = el.dataset.text || el.textContent;
        let scrambleInterval = null;
        let settledIndices = [];
        
        card.addEventListener('mouseenter', () => {
            let iterations = 0;
            const totalIterations = 12; // ~500ms at 40ms intervals
            settledIndices = [];
            
            // Assign random settle times to each letter
            const settleAt = originalText.split('').map(() => 
                Math.floor(Math.random() * (totalIterations - 2)) + 2
            );
            
            scrambleInterval = setInterval(() => {
                el.textContent = originalText
                    .split('')
                    .map((char, index) => {
                        // Keep spaces as spaces
                        if (char === ' ') return ' ';
                        // If this letter should settle, show original
                        if (iterations >= settleAt[index]) {
                            return originalText[index];
                        }
                        // Otherwise scramble
                        return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
                    })
                    .join('');
                
                iterations++;
                
                if (iterations >= totalIterations) {
                    clearInterval(scrambleInterval);
                    el.textContent = originalText;
                }
            }, 40);
        });
        
        card.addEventListener('mouseleave', () => {
            if (scrambleInterval) {
                clearInterval(scrambleInterval);
            }
            el.textContent = originalText;
        });
    });
});

// Zoom View Functions
function openZoomView(element, type) {
    const zoomModal = document.getElementById('zoomModal');
    const zoomContent = document.getElementById('zoomContent');
    
    if (!zoomModal || !zoomContent) return;
    
    // Clear previous content
    zoomContent.innerHTML = '';
    
    // Clone the video or create content based on type
    if (type === 'variant') {
        const video = element.querySelector('.variant-video');
        if (video) {
            const clonedVideo = video.cloneNode(true);
            clonedVideo.removeAttribute('style');
            clonedVideo.style.width = 'auto';
            clonedVideo.style.height = 'auto';
            clonedVideo.style.maxWidth = '100%';
            clonedVideo.style.maxHeight = '90vh';
            zoomContent.appendChild(clonedVideo);
        }
    } else {
        // For baseline, clone the image
        const image = element.querySelector('.variant-image');
        if (image) {
            const clonedImage = image.cloneNode(true);
            clonedImage.style.width = 'auto';
            clonedImage.style.height = 'auto';
            clonedImage.style.maxWidth = '100%';
            clonedImage.style.maxHeight = '90vh';
            zoomContent.appendChild(clonedImage);
        }
    }
    
    zoomModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeZoomView() {
    const zoomModal = document.getElementById('zoomModal');
    if (zoomModal) {
        zoomModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

