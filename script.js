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
        // Don't expand if clicking close button
        if (e.target.closest('.close-btn') || e.target.closest('.close-btn-square')) return;
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
    // Close any previously opened modal
    if (expandedCard) {
        closeModal();
    }
    
    // Get the expanded content from the card
    const expandedContent = card.querySelector('.card-expanded-content');
    if (!expandedContent) return;
    
    // Clone the content and add to modal
    const clonedContent = expandedContent.cloneNode(true);
    modalContent.innerHTML = '';
    modalContent.appendChild(clonedContent);
    
    // Update close button to use modal close function
    const closeBtn = modalContent.querySelector('.close-btn') || modalContent.querySelector('.close-btn-square');
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }
    
    // Hide intro section behind the modal
    if (introSection) {
        introSection.classList.add('hidden-behind');
    }
    
    // Show modal and overlay
    modal.classList.add('active');
    overlay.classList.add('active');
    expandedCard = card;
    
    // Prevent canvas scrolling when modal is open
    canvas.style.overflow = 'hidden';
}

function closeModal() {
    // Hide modal and overlay
    modal.classList.remove('active');
    overlay.classList.remove('active');
    
    // Clear modal content
    modalContent.innerHTML = '';
    
    // Restore intro section z-index
    if (introSection) {
        introSection.classList.remove('hidden-behind');
    }
    
    expandedCard = null;
    
    // Re-enable canvas scrolling
    canvas.style.overflow = 'auto';
}

// Keep closeCard for backward compatibility (in case any onclick handlers still use it)
function closeCard(closeButton) {
    closeModal();
}

// Close modal when clicking overlay
overlay.addEventListener('click', () => {
    if (expandedCard) {
        closeModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && expandedCard) {
        closeModal();
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

// Matrix effect for stat number on hover
const statCard = document.querySelector('.compact-card.stat-block');
const statNumber = document.querySelector('.stat-number');

if (statCard && statNumber) {
    let matrixInterval = null;
    
    statCard.addEventListener('mouseenter', () => {
        const originalText = statNumber.textContent;
        let elapsed = 0;
        const duration = 2000; // 2 seconds
        const updateInterval = 50; // Update every 50ms for smooth effect
        
        matrixInterval = setInterval(() => {
            elapsed += updateInterval;
            
            // Generate random number between 0 and 99
            const randomNum = Math.floor(Math.random() * 100);
            statNumber.textContent = `+${randomNum.toString().padStart(2, '0')}`;
            
            if (elapsed >= duration) {
                clearInterval(matrixInterval);
                statNumber.textContent = originalText; // Restore original
            }
        }, updateInterval);
    });
    
    statCard.addEventListener('mouseleave', () => {
        if (matrixInterval) {
            clearInterval(matrixInterval);
            statNumber.textContent = '+17'; // Restore original on leave
        }
    });
}


