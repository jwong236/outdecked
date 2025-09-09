console.log('Deck Builder JavaScript loading...');

// Enhanced Deck Builder JavaScript
class DeckBuilder {
    constructor() {
        this.currentDeck = null;
        this.searchResults = [];
        this.savedDecks = [];
        this.validationRules = {};
        this.isLoading = false;
        
        // Reusable filter system (same as search page)
        this.activeFilters = {
            or: [], // OR filters (purple pills) - any one must match
            and: [], // AND filters (blue pills) - all must match
            not: [] // NOT filters (red pills) - must NOT match
        };
        
        this.initializeEventListeners();
        this.loadValidationRules();
        
        // Set up default Union Arena filter (same as search page)
        this.addFilter('and', 'game', 'Union Arena', 'Game: Union Arena');
        
        // Load initial cards immediately, then populate filters
        console.log('Starting initial search...');
        
        // Test basic API call first
        this.testBasicSearch();
        
        this.performDeckSearch();
        
        this.loadFilterOptions().then(() => {
            console.log('Filter options loaded');
        });
    }
    
    initializeEventListeners() {
        console.log('Setting up event listeners...');
        
        // Save deck button
        const saveBtn = document.getElementById('saveDeckBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                console.log('Save deck button clicked');
                this.saveDeck();
            });
        } else {
            console.error('Save deck button not found');
        }
        
        // Select deck button
        const selectBtn = document.getElementById('selectDeckBtn');
        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                console.log('Select deck button clicked');
                this.loadSavedDecks();
            });
        } else {
            console.error('Select deck button not found');
        }
        
        // Deck search form
        const searchForm = document.getElementById('deckSearchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Deck search form submitted');
                this.performDeckSearch();
            });
        } else {
            console.error('Deck search form not found');
        }
        
        // Filter change events (using reusable filter system)
        const gameFilter = document.getElementById('gameFilter');
        if (gameFilter) {
            gameFilter.addEventListener('change', () => {
                const selectedGame = gameFilter.value;
                
                // Update the game filter in active filters
                this.activeFilters.and = this.activeFilters.and.filter(f => f.field !== 'game');
                if (selectedGame) {
                    this.addFilter('and', 'game', selectedGame, `Game: ${selectedGame}`);
                }
                
                // Update main filters based on selected game
                this.updateMainFiltersForGame(selectedGame);
            });
        }
        
        const seriesFilter = document.getElementById('seriesFilter');
        if (seriesFilter) {
            seriesFilter.addEventListener('change', () => {
                const selectedSeries = seriesFilter.value;
                
                // Remove existing series filter and add new one
                this.activeFilters.and = this.activeFilters.and.filter(f => f.field !== 'series');
                if (selectedSeries) {
                    this.addFilter('and', 'series', selectedSeries, `Series: ${selectedSeries}`);
                } else {
                    // If no series selected, trigger search to update results
                    this.updateFilterDisplay();
                    this.performDeckSearch();
                }
            });
        }
        
        const colorFilter = document.getElementById('colorFilter');
        if (colorFilter) {
            colorFilter.addEventListener('change', () => {
                const selectedColor = colorFilter.value;
                
                // Remove existing color filter and add new one
                this.activeFilters.and = this.activeFilters.and.filter(f => f.field !== 'color');
                if (selectedColor) {
                    this.addFilter('and', 'color', selectedColor, `Color: ${selectedColor}`);
                } else {
                    // If no color selected, trigger search to update results
                    this.updateFilterDisplay();
                    this.performDeckSearch();
                }
            });
        }
        
        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', () => {
                this.performDeckSearch();
            });
        }
        
        // Search functionality - only add if elements exist
        const searchCardsBtn = document.getElementById('searchCardsBtn');
        if (searchCardsBtn) {
            searchCardsBtn.addEventListener('click', () => this.searchCards());
        }
        
        const cardSearchInput = document.getElementById('cardSearchInput');
        if (cardSearchInput) {
            cardSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchCards();
            });
        }
        
        // Additional filter events for old search functionality
        const rarityFilter = document.getElementById('rarityFilter');
        if (rarityFilter) {
            rarityFilter.addEventListener('change', () => this.searchCards());
        }
        
        // Auto-save on deck name change
        const deckName = document.getElementById('deckName');
        if (deckName) {
            deckName.addEventListener('blur', () => {
                if (this.currentDeck && this.currentDeck.name !== deckName.value) {
                    this.currentDeck.name = deckName.value;
                    this.saveDeck();
                }
            });
        }
    }
    
    async loadValidationRules() {
        try {
            const response = await fetch('/api/deck-validation-rules');
            const data = await response.json();
            if (data.success) {
                this.validationRules = data.rules;
            }
        } catch (error) {
            console.error('Failed to load validation rules:', error);
        }
    }
    
    createNewDeck() {
        console.log('Creating new deck...');
        this.currentDeck = {
            id: null,
            name: 'New Deck',
            game: 'Union Arena',
            cards: [],
            created_date: new Date().toISOString(),
            last_modified: new Date().toISOString(),
            total_cards: 0,
            is_legal: false,
            description: ''
        };
        
        console.log('New deck created:', this.currentDeck);
        this.updateUI();
        document.getElementById('deckName').value = 'New Deck';
        console.log('UI updated for new deck');
    }
    
    async saveDeck() {
        if (!this.currentDeck) {
            this.createNewDeck();
        }
        
        const deckName = document.getElementById('deckName').value.trim();
        if (!deckName) {
            alert('Please enter a deck name');
            return;
        }
        
        this.currentDeck.name = deckName;
        
        try {
            const url = this.currentDeck.id ? '/api/decks/' + this.currentDeck.id : '/api/decks';
            const method = this.currentDeck.id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.currentDeck)
            });
            
            const data = await response.json();
            if (data.success) {
                this.currentDeck = data.deck;
                this.updateUI();
                alert('Deck saved successfully!');
            } else {
                alert('Failed to save deck: ' + data.error);
            }
        } catch (error) {
            console.error('Error saving deck:', error);
            alert('Failed to save deck');
        }
    }
    
    async showLoadDeckModal() {
        const modal = new bootstrap.Modal(document.getElementById('loadDeckModal'));
        modal.show();
        
        try {
            const response = await fetch('/api/decks');
            const data = await response.json();
            
            if (data.success) {
                this.savedDecks = data.decks;
                this.renderSavedDecks();
            } else {
                document.getElementById('savedDecksList').innerHTML = 
                    '<div class="text-center text-muted py-4">' +
                        '<i class="fas fa-exclamation-triangle fa-2x mb-3"></i>' +
                        '<p>Failed to load decks: ' + data.error + '</p>' +
                    '</div>';
            }
        } catch (error) {
            console.error('Error loading decks:', error);
            document.getElementById('savedDecksList').innerHTML = 
                '<div class="text-center text-muted py-4">' +
                    '<i class="fas fa-exclamation-triangle fa-2x mb-3"></i>' +
                    '<p>Failed to load decks</p>' +
                '</div>';
        }
    }
    
    renderSavedDecks() {
        const container = document.getElementById('savedDecksList');
        
        if (this.savedDecks.length === 0) {
            container.innerHTML = 
                '<div class="text-center text-muted py-4">' +
                    '<i class="fas fa-inbox fa-2x mb-3"></i>' +
                    '<p>No saved decks found</p>' +
                    '<small>Create and save a deck to see it here</small>' +
                '</div>';
            return;
        }
        
        container.innerHTML = this.savedDecks.map(deck => 
            '<div class="card mb-3">' +
                '<div class="card-body">' +
                    '<div class="row align-items-center">' +
                        '<div class="col-md-6">' +
                            '<h6 class="mb-1">' + deck.name + '</h6>' +
                            '<small class="text-muted">' + deck.game + ' • ' + deck.total_cards + ' cards</small>' +
                        '</div>' +
                        '<div class="col-md-3">' +
                            '<span class="badge ' + (deck.is_legal ? 'bg-success' : 'bg-warning') + '">' +
                                (deck.is_legal ? 'Legal' : 'Invalid') +
                            '</span>' +
                        '</div>' +
                        '<div class="col-md-3">' +
                            '<button class="btn btn-primary btn-sm" onclick="deckBuilder.loadDeck(\'' + deck.id + '\')">' +
                                'Load' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        ).join('');
    }
    
    async loadDeck(deckId) {
        try {
            const response = await fetch('/api/decks/' + deckId);
            const data = await response.json();
            
            if (data.success) {
                this.currentDeck = data.deck;
                this.updateUI();
                document.getElementById('deckName').value = this.currentDeck.name;
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('loadDeckModal'));
                modal.hide();
                
                alert('Deck loaded successfully!');
            } else {
                alert('Failed to load deck: ' + data.error);
            }
        } catch (error) {
            console.error('Error loading deck:', error);
            alert('Failed to load deck');
        }
    }
    
    async searchCards() {
        console.log('=== SEARCH CARDS DEBUG ===');
        if (this.isLoading) {
            console.log('Search already in progress, skipping');
            return;
        }
        
        const query = document.getElementById('cardSearchInput').value.trim();
        const game = document.getElementById('gameFilter').value;
        const rarity = document.getElementById('rarityFilter').value;
        const color = document.getElementById('colorFilter').value;
        
        console.log('Search parameters:', { query, game, rarity, color });
        
        if (!query) {
            console.log('No search query provided');
            alert('Please enter a search term');
            return;
        }
        
        this.isLoading = true;
        document.getElementById('searchResults').innerHTML = 
            '<div class="text-center text-muted py-4">' +
                '<i class="fas fa-spinner fa-spin fa-2x mb-3"></i>' +
                '<p>Searching cards...</p>' +
            '</div>';
        
        try {
            const params = new URLSearchParams({
                q: query,
                page: 1,
                per_page: 24
            });
            
            const filters = [];
            
            if (game) {
                filters.push({
                    type: 'and',
                    field: 'game',
                    value: game,
                    displayText: 'Game: ' + game
                });
            }
            
            if (rarity) {
                filters.push({
                    type: 'and',
                    field: 'rarity',
                    value: rarity,
                    displayText: 'Rarity: ' + rarity
                });
            }
            
            if (color) {
                filters.push({
                    type: 'and',
                    field: 'color',
                    value: color,
                    displayText: 'Color: ' + color
                });
            }
            
            if (filters.length > 0) {
                params.append('and_filters', JSON.stringify(filters));
            }
            
            console.log('Making API request to:', '/api/search?' + params);
            const response = await fetch('/api/search?' + params);
            console.log('API response status:', response.status);
            const data = await response.json();
            console.log('API response data:', data);
            
            if (data.cards) {
                console.log('Found', data.cards.length, 'cards');
                this.searchResults = data.cards;
                this.renderSearchResults();
            } else {
                document.getElementById('searchResults').innerHTML = 
                    '<div class="text-center text-muted py-4">' +
                        '<i class="fas fa-search fa-2x mb-3"></i>' +
                        '<p>No cards found</p>' +
                        '<small>Try adjusting your search terms or filters</small>' +
                    '</div>';
            }
        } catch (error) {
            console.error('Error searching cards:', error);
            document.getElementById('searchResults').innerHTML = 
                '<div class="text-center text-muted py-4">' +
                    '<i class="fas fa-exclamation-triangle fa-2x mb-3"></i>' +
                    '<p>Failed to search cards</p>' +
                    '<small>Please try again</small>' +
                '</div>';
        } finally {
            this.isLoading = false;
        }
    }
    
    renderSearchResults() {
        const container = document.getElementById('searchResults');
        
        if (this.searchResults.length === 0) {
            container.innerHTML = 
                '<div class="text-center text-muted py-4">' +
                    '<i class="fas fa-search fa-2x mb-3"></i>' +
                    '<p>No cards found</p>' +
                '</div>';
            return;
        }
        
        container.innerHTML = 
            '<div class="row">' +
                this.searchResults.map(card => {
                    const currentQuantity = this.getCardQuantityInDeck(card.id);
                    const maxQuantity = this.validationRules[this.currentDeck?.game || 'default']?.max_copies_per_card || 4;
                    const canAddMore = currentQuantity < maxQuantity;
                    
                    return 
                        '<div class="col-md-6 col-lg-4 col-xl-3 mb-3">' +
                            '<div class="card h-100 search-card" data-card-id="' + card.id + '">' +
                                '<div class="position-relative">' +
                                    '<img src="' + card.image_url + '" class="card-img-top" alt="' + card.name + '">' +
                                    (currentQuantity > 0 ? 
                                        '<span class="position-absolute top-0 end-0 badge bg-success m-2">' +
                                            currentQuantity + '/' + maxQuantity +
                                        '</span>' : '') +
                                '</div>' +
                                '<div class="card-body d-flex flex-column">' +
                                    '<h6 class="card-title">' + card.name + '</h6>' +
                                    '<p class="card-text small text-muted flex-grow-1">' +
                                        '<span class="badge bg-secondary me-1">' + (card.rarity || 'Unknown') + '</span>' +
                                        '<span class="badge bg-info me-1">' + (card.series || 'Unknown') + '</span>' +
                                        (card.color ? '<span class="badge bg-warning">' + card.color + '</span>' : '') +
                                    '</p>' +
                                    '<div class="d-grid gap-2">' +
                                        (canAddMore ? 
                                            '<button class="btn btn-primary btn-sm" onclick="deckBuilder.addCardToDeck(' + JSON.stringify(card).replace(/"/g, '&quot;') + ')">' +
                                                '<i class="fas fa-plus me-2"></i>Add to Deck' +
                                            '</button>' : 
                                            '<button class="btn btn-secondary btn-sm" disabled>' +
                                                '<i class="fas fa-check me-2"></i>Max Copies (' + maxQuantity + ')' +
                                            '</button>') +
                                        (currentQuantity > 0 ? 
                                            '<button class="btn btn-outline-danger btn-sm" onclick="deckBuilder.removeCardFromDeck(' + card.id + ')">' +
                                                '<i class="fas fa-minus me-2"></i>Remove' +
                                            '</button>' : '') +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>';
                }).join('') +
            '</div>';
    }
    
    async addCardToDeck(card) {
        if (!this.currentDeck) {
            this.createNewDeck();
        }
        
        try {
            const response = await fetch('/api/decks/' + this.currentDeck.id + '/cards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    card: card,
                    quantity: 1
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.currentDeck = data.deck;
                this.updateUI();
                this.renderSearchResults(); // Update search results to show new quantities
                alert('Card added to deck!');
            } else {
                alert('Failed to add card: ' + data.error);
            }
        } catch (error) {
            console.error('Error adding card:', error);
            alert('Failed to add card to deck');
        }
    }
    
    updateUI() {
        if (!this.currentDeck) {
            this.createNewDeck();
        }
        
        // Update deck card count
        const deckCardCount = document.getElementById('deckCardCount');
        if (deckCardCount) {
            deckCardCount.textContent = this.currentDeck.total_cards + ' cards';
        }
        
        // Update deck statistics
        const totalCards = document.getElementById('totalCards');
        if (totalCards) {
            totalCards.textContent = this.currentDeck.total_cards;
        }
        
        const uniqueCards = document.getElementById('uniqueCards');
        if (uniqueCards) {
            uniqueCards.textContent = this.currentDeck.cards.length;
        }
        
        const deckGame = document.getElementById('deckGame');
        if (deckGame) {
            deckGame.textContent = this.currentDeck.game;
        }
        
        // Update deck status
        const statusElement = document.getElementById('deckStatus');
        if (statusElement) {
            if (this.currentDeck.is_legal) {
                statusElement.innerHTML = '<span class="badge bg-success">Legal</span>';
            } else {
                statusElement.innerHTML = '<span class="badge bg-warning">Invalid</span>';
            }
        }
        
        // Update rarity breakdown
        this.updateRarityBreakdown();
        
        // Update validation errors
        this.updateValidationErrors();
        
        // Update deck card list
        this.renderDeckCards();
    }
    
    updateRarityBreakdown() {
        const rarityCounts = {
            'Common': 0,
            'Uncommon': 0,
            'Rare': 0,
            'Super Rare': 0,
            'Unknown': 0
        };
        
        this.currentDeck.cards.forEach(card => {
            const rarity = card.metadata.rarity || 'Unknown';
            const quantity = card.quantity || 1;
            rarityCounts[rarity] = (rarityCounts[rarity] || 0) + quantity;
        });
        
        const breakdownElement = document.getElementById('rarityBreakdown');
        if (breakdownElement) {
            breakdownElement.innerHTML = 
                '<div class="d-flex justify-content-center gap-2 flex-wrap">' +
                    '<span class="badge bg-secondary">Common: ' + rarityCounts.Common + '</span>' +
                    '<span class="badge bg-primary">Uncommon: ' + rarityCounts.Uncommon + '</span>' +
                    '<span class="badge bg-warning">Rare: ' + rarityCounts.Rare + '</span>' +
                    '<span class="badge bg-danger">Super Rare: ' + rarityCounts['Super Rare'] + '</span>' +
                    (rarityCounts.Unknown > 0 ? '<span class="badge bg-dark">Unknown: ' + rarityCounts.Unknown + '</span>' : '') +
                '</div>';
        }
    }
    
    updateValidationErrors() {
        const errorsContainer = document.getElementById('validationErrors');
        const errorsList = document.getElementById('validationErrorList');
        
        if (errorsContainer && errorsList) {
            if (this.currentDeck.validation_errors && this.currentDeck.validation_errors.length > 0) {
                errorsList.innerHTML = this.currentDeck.validation_errors.map(error => '<li>' + error + '</li>').join('');
                errorsContainer.style.display = 'block';
            } else {
                errorsContainer.style.display = 'none';
            }
        }
    }
    
    renderDeckCards() {
        const container = document.getElementById('deckCardList');
        
        if (this.currentDeck.cards.length === 0) {
            container.innerHTML = 
                '<div class="text-center text-muted py-4">' +
                    '<i class="fas fa-inbox fa-2x mb-2"></i>' +
                    '<p class="mb-1">No cards in deck</p>' +
                    '<small>Search and add cards to build your deck</small>' +
                '</div>';
            return;
        }
        
        container.innerHTML = this.currentDeck.cards.map(card => {
            const maxQuantity = this.validationRules[this.currentDeck.game || 'default']?.max_copies_per_card || 4;
            
            return 
                '<div class="deck-card-item" data-card-id="' + card.card_id + '">' +
                    '<img src="' + card.image_url + '" alt="' + card.name + '">' +
                    '<div class="deck-card-info">' +
                        '<h6>' + card.name + '</h6>' +
                        '<div class="small text-muted">' +
                            '<span class="badge bg-secondary me-1">' + (card.metadata.rarity || 'Unknown') + '</span>' +
                            '<span class="badge bg-info me-1">' + (card.metadata.series || 'Unknown') + '</span>' +
                            (card.metadata.color ? '<span class="badge bg-warning">' + card.metadata.color + '</span>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div class="deck-card-controls">' +
                        '<button class="btn btn-outline-secondary btn-sm" onclick="deckBuilder.adjustCardQuantity(' + card.card_id + ', -1)" ' + (card.quantity <= 1 ? 'disabled' : '') + '>' +
                            '<i class="fas fa-minus"></i>' +
                        '</button>' +
                        '<span class="quantity-display">' + card.quantity + '</span>' +
                        '<button class="btn btn-outline-secondary btn-sm" onclick="deckBuilder.adjustCardQuantity(' + card.card_id + ', 1)" ' + (card.quantity >= maxQuantity ? 'disabled' : '') + '>' +
                            '<i class="fas fa-plus"></i>' +
                        '</button>' +
                        '<button class="btn btn-outline-danger btn-sm" onclick="deckBuilder.removeCardFromDeck(' + card.card_id + ')" title="Remove from deck">' +
                            '<i class="fas fa-trash"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>';
        }).join('');
    }
    
    async removeCardFromDeck(cardId) {
        if (!this.currentDeck) return;
        
        try {
            const response = await fetch('/api/decks/' + this.currentDeck.id + '/cards/' + cardId, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ quantity: 1 })
            });
            
            const data = await response.json();
            if (data.success) {
                this.currentDeck = data.deck;
                this.updateUI();
                this.renderSearchResults(); // Update search results to show new quantities
            } else {
                alert('Failed to remove card: ' + data.error);
            }
        } catch (error) {
            console.error('Error removing card:', error);
            alert('Failed to remove card from deck');
        }
    }
    
    async adjustCardQuantity(cardId, change) {
        if (!this.currentDeck) return;
        
        const currentCard = this.currentDeck.cards.find(c => c.card_id === cardId);
        if (!currentCard) return;
        
        const newQuantity = currentCard.quantity + change;
        if (newQuantity < 0) return;
        
        try {
            const response = await fetch('/api/decks/' + this.currentDeck.id + '/cards/' + cardId, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ quantity: newQuantity })
            });
            
            const data = await response.json();
            if (data.success) {
                this.currentDeck = data.deck;
                this.updateUI();
                this.renderSearchResults(); // Update search results to show new quantities
            } else {
                alert('Failed to update card quantity: ' + data.error);
            }
        } catch (error) {
            console.error('Error updating card quantity:', error);
            alert('Failed to update card quantity');
        }
    }
    
    getCardQuantityInDeck(cardId) {
        if (!this.currentDeck) return 0;
        const card = this.currentDeck.cards.find(c => c.card_id === cardId);
        return card ? card.quantity : 0;
    }
    
    clearDeck() {
        if (!this.currentDeck) return;
        
        if (confirm('Are you sure you want to clear all cards from this deck?')) {
            this.currentDeck.cards = [];
            this.currentDeck.total_cards = 0;
            this.currentDeck.is_legal = false;
            this.updateUI();
            this.renderSearchResults();
        }
    }
    
    sortDeckByName() {
        if (!this.currentDeck) return;
        
        this.currentDeck.cards.sort((a, b) => a.name.localeCompare(b.name));
        this.renderDeckCards();
    }
    
    sortDeckByRarity() {
        if (!this.currentDeck) return;
        
        const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Unknown'];
        this.currentDeck.cards.sort((a, b) => {
            const aRarity = a.metadata.rarity || 'Unknown';
            const bRarity = b.metadata.rarity || 'Unknown';
            return rarityOrder.indexOf(aRarity) - rarityOrder.indexOf(bRarity);
        });
        this.renderDeckCards();
    }
    
    // Load filter options for dropdowns (now uses reusable methods)
    async loadFilterOptions() {
        try {
            const gameFilter = document.getElementById('gameFilter');
            const game = gameFilter ? gameFilter.value : 'Union Arena';
            
            // Use the reusable dropdown population methods
            this.populateSeriesDropdown();
            this.populateColorDropdown();
            
        } catch (error) {
            console.error('Error loading filter options:', error);
        }
    }
    
    async performDeckSearch() {
        if (this.isLoading) return;
        
        console.log('=== DECK SEARCH STARTING ===');
        
        try {
            this.isLoading = true;
            this.showDeckLoadingState();
            
            const searchInput = document.getElementById('cardSearchInput');
            const gameFilter = document.getElementById('gameFilter');
            const seriesFilter = document.getElementById('seriesFilter');
            const colorFilter = document.getElementById('colorFilter');
            const sortBy = document.getElementById('sortBy');
            
            console.log('Elements found:', {
                searchInput: !!searchInput,
                gameFilter: !!gameFilter,
                seriesFilter: !!seriesFilter,
                colorFilter: !!colorFilter,
                sortBy: !!sortBy
            });
            
            const params = new URLSearchParams();
            if (searchInput && searchInput.value.trim()) {
                params.append('q', searchInput.value.trim());
            }
            if (sortBy && sortBy.value) {
                params.append('sort', sortBy.value);
            }
            
            // Add filters to params using the reusable filter system
            if (this.activeFilters.or.length > 0) {
                params.append('or_filters', JSON.stringify(this.activeFilters.or));
            }
            if (this.activeFilters.and.length > 0) {
                params.append('and_filters', JSON.stringify(this.activeFilters.and));
            }
            if (this.activeFilters.not.length > 0) {
                params.append('not_filters', JSON.stringify(this.activeFilters.not));
            }
            
            const searchUrl = '/api/search?' + params.toString();
            console.log('Search URL:', searchUrl);
            console.log('Active Filters:', this.activeFilters);
            
            const response = await fetch(searchUrl);
            console.log('Response status:', response.status);
            
            const data = await response.json();
            console.log('Response data:', data);
            
            // Check if we have cards (success might not be in response)
            if (data.cards && data.cards.length > 0) {
                this.searchResults = data.cards || [];
                console.log('Search results count:', this.searchResults.length);
                this.renderDeckSearchResults();
                this.updateDeckActiveFilters();
            } else if (data.success === false) {
                console.error('Search failed:', data.error);
                this.showDeckNoResultsState();
            } else {
                // No cards found
                this.searchResults = [];
                console.log('No cards found');
                this.showDeckNoResultsState();
            }
        } catch (error) {
            console.error('Error performing deck search:', error);
            this.showDeckNoResultsState();
        } finally {
            this.isLoading = false;
            console.log('=== DECK SEARCH COMPLETE ===');
        }
    }
    
    renderDeckSearchResults() {
        const resultsContainer = document.getElementById('deckSearchResults');
        const initialState = document.getElementById('deckInitialState');
        const noResultsState = document.getElementById('deckNoResultsState');
        const loadingState = document.getElementById('deckLoadingState');
        
        if (!resultsContainer) {
            console.error('Results container not found!');
            return;
        }
        
        // Hide all other states
        if (initialState) initialState.style.display = 'none';
        if (noResultsState) noResultsState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'none';
        
        if (this.searchResults.length === 0) {
            this.showDeckNoResultsState();
            return;
        }
        
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '';
        
        this.searchResults.forEach((card, index) => {
            const cardElement = this.createDeckSearchCard(card);
            resultsContainer.appendChild(cardElement);
        });
        
        console.log('Cards rendered:', this.searchResults.length);
    }
    
    createDeckSearchCard(card) {
        const quantity = this.getCardQuantityInDeck(card.id);
        const isInDeck = quantity > 0;
        
        // Get rarity safely - the API puts metadata fields directly on the card object
        const rarity = card.rarity || 'Unknown';
        
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.innerHTML = `
            <img src="${card.image_url || '/static/placeholder-card.png'}" 
                 class="card-image" 
                 alt="${card.name}"
                 onerror="this.src='/static/placeholder-card.png'">
            <div class="card-body">
                <h6 class="card-title">${card.name}</h6>
                <p class="card-text">${rarity}</p>
                ${isInDeck ? 
                    `<div class="d-flex justify-content-center align-items-center gap-1">
                        <button class="btn btn-sm btn-outline-danger" onclick="deckBuilder.removeCardFromDeck(${card.id})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="badge bg-success">${quantity}</span>
                        <button class="btn btn-sm btn-success" onclick="deckBuilder.addCardToDeck(${card.id})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>` :
                    `<button class="btn btn-sm btn-primary" onclick="deckBuilder.addCardToDeck(${card.id})">
                        <i class="fas fa-plus me-1"></i>Add
                    </button>`
                }
            </div>
        `;
        
        return cardDiv;
    }
    
    updateDeckActiveFilters() {
        const activeFilters = document.getElementById('deckActiveFilters');
        const filterPills = document.getElementById('deckFilterPills');
        
        if (!activeFilters || !filterPills) return;
        
        const filters = [];
        
        const gameFilter = document.getElementById('gameFilter');
        if (gameFilter && gameFilter.value) {
            filters.push({ type: 'game', value: gameFilter.value, displayText: gameFilter.value });
        }
        
        const seriesFilter = document.getElementById('seriesFilter');
        if (seriesFilter && seriesFilter.value) {
            filters.push({ type: 'series', value: seriesFilter.value, displayText: seriesFilter.value });
        }
        
        const colorFilter = document.getElementById('colorFilter');
        if (colorFilter && colorFilter.value) {
            filters.push({ type: 'color', value: colorFilter.value, displayText: colorFilter.value });
        }
        
        const sortBy = document.getElementById('sortBy');
        if (sortBy && sortBy.value) {
            const sortText = sortBy.options[sortBy.selectedIndex].text;
            filters.push({ type: 'sort', value: sortBy.value, displayText: sortText });
        }
        
        if (filters.length === 0) {
            activeFilters.style.display = 'none';
        } else {
            activeFilters.style.display = 'block';
            filterPills.innerHTML = '';
            
            filters.forEach(filter => {
                const pill = document.createElement('span');
                pill.className = 'badge bg-secondary me-1';
                pill.innerHTML = `${filter.displayText} <button type="button" class="btn-close btn-close-white ms-1" onclick="deckBuilder.removeDeckFilter('${filter.type}')"></button>`;
                filterPills.appendChild(pill);
            });
        }
    }
    
    removeDeckFilter(filterType) {
        const filterElement = document.getElementById(filterType + 'Filter');
        if (filterElement) {
            filterElement.value = '';
            this.performDeckSearch();
        }
    }
    
    showDeckLoadingState() {
        const loadingState = document.getElementById('deckLoadingState');
        const resultsContainer = document.getElementById('deckSearchResults');
        const initialState = document.getElementById('deckInitialState');
        const noResultsState = document.getElementById('deckNoResultsState');
        
        if (loadingState) loadingState.style.display = 'block';
        if (resultsContainer) resultsContainer.style.display = 'none';
        if (initialState) initialState.style.display = 'none';
        if (noResultsState) noResultsState.style.display = 'none';
    }
    
    showDeckNoResultsState() {
        const noResultsState = document.getElementById('deckNoResultsState');
        const resultsContainer = document.getElementById('deckSearchResults');
        const initialState = document.getElementById('deckInitialState');
        const loadingState = document.getElementById('deckLoadingState');
        
        if (noResultsState) noResultsState.style.display = 'block';
        if (resultsContainer) resultsContainer.style.display = 'none';
        if (initialState) initialState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'none';
    }
    
    // Alias for performDeckSearch to match old event listener calls
    searchCards() {
        this.performDeckSearch();
    }
    
    // Test basic API functionality
    async testBasicSearch() {
        console.log('=== TESTING BASIC SEARCH API ===');
        try {
            const response = await fetch('/api/search?and_filters=[{"field":"game","value":"Union Arena","type":"and"}]');
            console.log('Test API response status:', response.status);
            const data = await response.json();
            console.log('Test API response data:', data);
        } catch (error) {
            console.error('Test API error:', error);
        }
        console.log('=== BASIC SEARCH TEST COMPLETE ===');
    }
    
    // Reusable filter system methods (copied from search page)
    addFilter(type, field, value, displayText) {
        const filter = { field, value, displayText };
        
        // Check if filter already exists
        const existingFilter = this.activeFilters[type].find(f => f.field === field && f.value === value);
        if (existingFilter) return;
        
        this.activeFilters[type].push(filter);
        this.updateFilterDisplay();
        this.performDeckSearch();
    }
    
    removeFilter(type, field, value) {
        this.activeFilters[type] = this.activeFilters[type].filter(f => !(f.field === field && f.value === value));
        
        // Update dropdown state when filter is removed
        if (field === 'game') {
            document.getElementById('gameFilter').value = '';
        } else if (field === 'series') {
            document.getElementById('seriesFilter').value = '';
        } else if (field === 'color') {
            document.getElementById('colorFilter').value = '';
        }
        
        this.updateFilterDisplay();
        this.performDeckSearch();
    }
    
    clearAllFilters() {
        // Preserve game filter only - clear all other filters
        const preservedFilters = this.activeFilters.and.filter(f => f.field === 'game');
        this.activeFilters.or = [];
        this.activeFilters.and = preservedFilters;
        this.activeFilters.not = [];
        
        // Reset dropdowns to default values
        document.getElementById('seriesFilter').value = '';
        document.getElementById('colorFilter').value = '';
        document.getElementById('sortBy').value = '';
        
        this.updateFilterDisplay();
        this.performDeckSearch();
    }
    
    updateFilterDisplay() {
        const filterPills = document.getElementById('deckFilterPills');
        const activeFiltersDiv = document.getElementById('deckActiveFilters');
        
        // Clear existing pills
        filterPills.innerHTML = '';
        
        // Add OR filters first (they take priority)
        this.activeFilters.or.forEach(filter => {
            const pill = this.createFilterPill(filter, 'or');
            filterPills.appendChild(pill);
        });
        
        // Add AND filters
        this.activeFilters.and.forEach(filter => {
            const pill = this.createFilterPill(filter, 'and');
            filterPills.appendChild(pill);
        });
        
        // Add NOT filters
        this.activeFilters.not.forEach(filter => {
            const pill = this.createFilterPill(filter, 'not');
            filterPills.appendChild(pill);
        });
        
        // Show/hide the active filters section
        const hasFilters = this.activeFilters.or.length > 0 || this.activeFilters.and.length > 0 || this.activeFilters.not.length > 0;
        activeFiltersDiv.style.display = hasFilters ? 'block' : 'none';
    }
    
    createFilterPill(filter, type) {
        const pill = document.createElement('div');
        pill.className = `filter-pill ${type}-filter`;
        
        // Add type indicator for all filter types
        const typeIndicator = type.toUpperCase();
        pill.innerHTML = `
            <span class="type-indicator">${typeIndicator}</span>
            ${filter.displayText}
            <button class="remove-btn" onclick="deckBuilder.removeFilter('${type}', '${filter.field}', '${filter.value}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        return pill;
    }
    
    // Update main filters based on selected game (same as search page)
    updateMainFiltersForGame(game) {
        // Remove existing filters that are game-specific
        this.activeFilters.and = this.activeFilters.and.filter(f => f.field !== 'series' && f.field !== 'color');
        
        // Update filter labels and populate dropdowns based on game
        if (game === 'Union Arena') {
            document.querySelector('label[for="seriesFilter"]').textContent = 'Series';
            document.querySelector('label[for="colorFilter"]').textContent = 'Color';
            this.populateSeriesDropdown();
            this.populateColorDropdown();
        } else if (game === 'Pokemon') {
            document.querySelector('label[for="seriesFilter"]').textContent = 'Type';
            document.querySelector('label[for="colorFilter"]').textContent = 'Stage';
            // For Pokemon, we would populate with Type and Stage values
            // But since we haven't scraped Pokemon yet, we'll leave them empty
        } else {
            // Hide main filters for unknown games
            document.querySelector('label[for="seriesFilter"]').textContent = 'Filter 1';
            document.querySelector('label[for="colorFilter"]').textContent = 'Filter 2';
        }
        
        this.updateFilterDisplay();
    }
    
    // Populate series dropdown (same as search page)
    populateSeriesDropdown() {
        const gameFilter = document.getElementById('gameFilter');
        const game = gameFilter ? gameFilter.value : 'Union Arena';
        
        fetch(`/api/metadata-values/${encodeURIComponent(game)}/series`)
            .then(response => response.json())
            .then(series => {
                const dropdown = document.getElementById('seriesFilter');
                // Clear existing options except the first "All Series" option
                dropdown.innerHTML = '<option value="">All Series</option>';
                
                series.forEach(seriesName => {
                    const option = document.createElement('option');
                    option.value = seriesName;
                    option.textContent = seriesName;
                    dropdown.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error loading series values:', error);
            });
    }
    
    // Populate color dropdown (same as search page)
    populateColorDropdown() {
        const gameFilter = document.getElementById('gameFilter');
        const game = gameFilter ? gameFilter.value : 'Union Arena';
        
        fetch(`/api/color-values?game=${encodeURIComponent(game)}`)
            .then(response => response.json())
            .then(colors => {
                const dropdown = document.getElementById('colorFilter');
                // Clear existing options except the first "All Colors" option
                dropdown.innerHTML = '<option value="">All Colors</option>';
                
                colors.forEach(color => {
                    const option = document.createElement('option');
                    option.value = color;
                    option.textContent = color;
                    dropdown.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error loading color values:', error);
            });
    }
}

// Global function for clearing deck filters (now uses reusable method)
function clearDeckFilters() {
    if (deckBuilder) {
        deckBuilder.clearAllFilters();
    }
}

// Initialize deck builder when page loads
let deckBuilder;
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Deck Builder...');
    
    try {
        deckBuilder = new DeckBuilder();
        deckBuilder.createNewDeck();
        console.log('Deck Builder initialized successfully');
    } catch (error) {
        console.error('Error initializing Deck Builder:', error);
    }
});