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

const canvas = document.getElementById('canvas');
const canvasSpace = document.getElementById('canvasSpace');
const overlay = document.getElementById('overlay');
const cards = document.querySelectorAll('.project-card');

// ============================================
// CANVAS MOUSE PANNING - Simple implementation
// ============================================

canvas.addEventListener('mousedown', function(e) {
    // Skip if clicking on interactive elements
    if (e.target.closest('.project-card') || 
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
    if (!isDragging) return;
    
    e.preventDefault();
    
    const dx = e.pageX - startX;
    const dy = e.pageY - startY;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged = true;
    }
    
    canvas.scrollLeft = scrollLeft - dx;
    canvas.scrollTop = scrollTop - dy;
});

canvas.addEventListener('mouseup', function() {
    isDragging = false;
    canvas.style.cursor = 'grab';
});

canvas.addEventListener('mouseleave', function() {
    isDragging = false;
    canvas.style.cursor = 'grab';
});

// ============================================
// CARD DRAGGING
// ============================================

document.addEventListener('mouseup', function() {
    if (isDraggingCard && draggedCard) {
        isDraggingCard = false;
        draggedCard.style.cursor = 'pointer';
        document.body.style.cursor = '';
        draggedCard = null;
        // Keep hasDragged true so click handler knows we just dragged
    }
});

document.addEventListener('mousemove', function(e) {
    if (!isDraggingCard || !draggedCard) return;
    
    e.preventDefault();
    
    const deltaX = e.pageX - cardStartX;
    const deltaY = e.pageY - cardStartY;
    
    // Mark as dragged if moved more than 5px
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasDragged = true;
    }
    
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
        
        // Don't drag if card is expanded
        if (card.classList.contains('expanded')) {
            return;
        }
        
        e.stopPropagation();
        
        // Reset drag state
        hasDragged = false;
        
        // Start card dragging
        isDraggingCard = true;
        draggedCard = card;
        
        // Store initial mouse position
        cardStartX = e.pageX;
        cardStartY = e.pageY;
        
        // Get current card position relative to canvas-space
        const currentLeft = parseInt(card.style.left) || 0;
        const currentTop = parseInt(card.style.top) || 0;
        cardInitialLeft = currentLeft;
        cardInitialTop = currentTop;
        
        // Update cursor
        card.style.cursor = 'grabbing';
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    });
    
    // Handle card click - whole card is clickable, expand if we didn't drag
    card.addEventListener('click', (e) => {
        // Don't expand if clicking close button
        if (e.target.closest('.close-btn')) return;
        // Don't expand if already expanded
        if (card.classList.contains('expanded')) return;
        
        e.stopPropagation();
        // Small delay to check if we actually dragged
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

function expandCard(card) {
    // Close any previously expanded card
    if (expandedCard && expandedCard !== card) {
        closeCard(expandedCard.querySelector('.close-btn'));
    }
    
    // Store original positioning so we can restore after modal-style expand
    card.dataset.originalLeft = card.style.left || '';
    card.dataset.originalTop = card.style.top || '';
    card.dataset.originalPosition = card.style.position || '';
    card.dataset.originalTransform = card.style.transform || '';
    card.dataset.originalZIndex = card.style.zIndex || '';
    
    // Modal-style expand: center in viewport, independent of scroll
    card.style.position = 'fixed';
    card.style.left = '50%';
    card.style.top = '50%';
    card.style.transform = 'translate(-50%, -50%)';
    card.style.zIndex = '1100';
    
    // Hide intro section behind the expanded card
    if (introSection) {
        introSection.classList.add('hidden-behind');
    }
    
    // Expand the card
    card.classList.add('expanded');
    overlay.classList.add('active');
    expandedCard = card;
    
    // Prevent canvas scrolling when card is expanded
    canvas.style.overflow = 'hidden';
}

function closeCard(closeButton) {
    const card = closeButton.closest('.project-card');
    
    // Restore original position for cards
    const originalLeft = card.dataset.originalLeft ?? '';
    const originalTop = card.dataset.originalTop ?? '';
    const originalPosition = card.dataset.originalPosition ?? '';
    const originalTransform = card.dataset.originalTransform ?? '';
    const originalZIndex = card.dataset.originalZIndex ?? '';
    
    card.style.position = originalPosition;
    card.style.left = originalLeft;
    card.style.top = originalTop;
    card.style.transform = originalTransform;
    card.style.zIndex = originalZIndex;
    
    // Restore intro section z-index
    if (introSection) {
        introSection.classList.remove('hidden-behind');
    }
    
    // Collapse the card
    card.classList.remove('expanded');
    overlay.classList.remove('active');
    expandedCard = null;
    
    // Re-enable canvas scrolling
    canvas.style.overflow = 'auto';
}

// Close card when clicking overlay
overlay.addEventListener('click', () => {
    if (expandedCard) {
        const closeBtn = expandedCard.querySelector('.close-btn');
        if (closeBtn) {
            closeCard(closeBtn);
        }
    }
});

// Close card with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && expandedCard) {
        const closeBtn = expandedCard.querySelector('.close-btn');
        if (closeBtn) {
            closeCard(closeBtn);
        }
    }
});

// Prevent card expansion when clicking inside expanded content
cards.forEach(card => {
    const expandedContent = card.querySelector('.card-expanded-content');
    if (expandedContent) {
        expandedContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
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

