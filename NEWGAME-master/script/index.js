"use strict"


function Word(wordLabel, wordSpeed, wordIndex, occupiedPositions) {
    /**
     * @param wordLabel - the label of the word
     * @param  wordSpeed - the speed of the word
     * @param wordIndex - represents the position of this objet inside the hash table
     * @param htmlElem - a reference to the dom element
     * @param wordAnimation - interval object which animates the word
     * @param occupiedPositions - array with all the occupiedPositions so the new word won't overlap them
     * @param wordHeight - the height of the word depending on the font-size, this is a known value
     * @param canNotDraw - boolean values to check if the word can be drawn or not
     * @param wordsContainer - html element where the words are drawn
     * @param shownBeatHighScore - boolean which indicates that the user saw that he beaten the previous max score 
     */
    this.wordLabel = wordLabel;
    this.wordSpeed = wordSpeed;
    this.wordIndex = wordIndex;
    this.occupiedPositions = occupiedPositions;
    this.htmlElem = undefined
    this.wordAnimation = undefined;
    this.wordHeight = 20;
    this.canNotDraw = false;
    this.wordsContainer = document.querySelector("#words-canvas");
    this.shownBeatHighScore = false;
    /**
     * * getRandomYPoz() 
     * * get a random pozition on Y but not one which overlaps with the others
     */
    this.getRandomYPoz = function (containerHeight, wordWidth, maxAttempts = 5) {

        /**
         * *  if a position can not be found then return false and skip this word
        */
        if (maxAttempts == 0) return false

        /**
         * * get a random position and assume that the position is a valid one
        */
        let randomYPoz = Math.random() * containerHeight,
            ok = true;

        /**
         * * prevent outer edge 
         */
        if (randomYPoz >= containerHeight - this.wordHeight) randomYPoz = containerHeight - this.wordHeight;

        /**
         * * prevent overlaping
         */
        for (let i = 0; i < this.occupiedPositions.length; i++) {
            const occupiedY = this.occupiedPositions[i]['y'],
                occupiedX = this.occupiedPositions[i]['x'];
            if ((Math.abs(randomYPoz - occupiedY) <= this.wordHeight) && (occupiedX <= wordWidth)) {
                ok = false;
                break;
            }
        }

        /**
         * * if a valid position was found then return that position, otherwise try again
         */
        if (ok) return randomYPoz
        else return this.getRandomYPoz(containerHeight, wordWidth, --maxAttempts)
    }

    /**
     * * drawWord()
     * * this function will draw the word on the canvas and it will start to animate it
     */
    this.drawWord = function () {
        const span = document.createElement('span'),
            textNode = document.createTextNode(this.wordLabel);

        const containerHeight = parseInt(window.getComputedStyle(this.wordsContainer, null).getPropertyValue('height'));

        let randomYPoz;

        /**
         * * format the span
         */
        span.append(textNode);
        span.classList.add('word');


        /**
         * * add the element on the ui to get it's width and after remove it
         * ! if no position was found, jus delete the element and return
         */
        this.wordsContainer.append(span)
        randomYPoz = this.getRandomYPoz(containerHeight, span.clientWidth)
        if (!randomYPoz) {
            span.remove();
            return false;
        }
        span.remove();

        /**
         * * draw the elem again
         */
        span.style.top = randomYPoz + 'px'
        this.wordsContainer.append(span)

        /**
         * * create a referene & animate the word 
         */
        this.htmlElem = span;
        this.animateWord();

        return true;
    }

    /**
     * * animateWord()
     * * animate the word from left to right and trigger an event when the word is out of bonds 
     */
    this.animateWord = function () {
        this.wordAnimation = setInterval(() => {
            const actualPozX = this.htmlElem.offsetLeft;
            this.htmlElem.style.left = actualPozX + this.wordSpeed + 'px';
            /**
             * * if the word is out, then trigger the even and send the index of the word
             */
            if (actualPozX > window.innerWidth) {
                const wordOut = new CustomEvent("wordOut", {
                    detail: {
                        wordIndex: this.wordIndex
                    }
                });
                this.wordsContainer.dispatchEvent(wordOut)
            }
        }, 50)
    }

    /**
     * * init()
     * * draw the word and set this.canNotDraw to true in case that the word can't be drawn
     */
    this._init_ = function () {
        let isAvailableSpace = this.drawWord();
        if (!isAvailableSpace) this.canNotDraw = true;
    }

    this._init_();
}




/**
 * * Game object constructor
 */
function Game(wordsLanguage) {
    /**
     * @param wordsLanguage - the language of the words to use for this game
     * @param availableWords - array with all the words
     * @param visibleWords - hashtable with all the words that are visible on the canvas and the user must type
     * @param typedWord - the word that user is currently typing
     * @param totalPoints - total points of the user
     * @param gameSettings - settings for the game from gameSettings.json
     * @param gameLevel - used to count the game level, this variables is used to get the settings from gameSettings.json
     * @param maxLevel - maximum level from gameSettings.json
     * @param changeGameLevel - boolean to check if the game level changed or not
     * @param playGameInterval - game interval in which new words are added
     * @param lives - used to count remaining lives for this game
     * @param wordsContainer - html element where the words are drawn
     * @param highScoreHTML - html element where the high score is written
     * 
     */
    this.wordsLanguage = wordsLanguage;
    this.availableWords = undefined;
    this.visibleWords = {};
    this.typedWord = '';
    this.totalPoints = 0;
    this.gameSettings = undefined;
    this.gameLevel = 1;
    this.maxLevel = undefined
    this.changeGameLevel = true;
    this.playGameInterval = undefined
    this.lives = undefined;
    this.wordsContainer = document.querySelector("#words-canvas");
    this.highScoreHTML = document.querySelector("#high-score")


    /** 
     * * getWords()
     * * make a httpReq and get the words
     * ! the array will be stored inside this.words
     */
    this.getWords = function () {
        const xhttp = new XMLHttpRequest(),
            fileURL = `./data/words-${this.wordsLanguage}.json`,
            _this = this;
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200)
                _this.availableWords = JSON.parse(this.responseText);
        };
        xhttp.open("GET", fileURL, false);
        xhttp.send();
    }

    /** 
     * * getSettings()
     * * make a httpReq and get the settings for this game
     */
    this.getSettings = function () {
        const xhttp = new XMLHttpRequest(),
            fileURL = `./data/gameSettings.json`,
            _this = this;
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {

                _this.gameSettings = JSON.parse(this.responseText);
                _this.lives = _this.gameSettings.lives
                _this.maxLevel = Object.keys(_this.gameSettings.levels)[Object.keys(_this.gameSettings.levels).length - 1]
            }

        };
        xhttp.open("GET", fileURL, false);
        xhttp.send();
    }


    /**
     * * addWord()
     * * add a new word object inside visibleWords hashtable
     * ! this function initiate a new word instance
     */
    this.addWord = function (wordLabel, wordSpeed) {
        let wordIndex;
        let hastableKeys = Object.keys(this.visibleWords);

        /**
         * * set the wordIndex inside the hastable
         * * if the hastable is empty the index will be 0, otherwise it will be last value++
         */
        wordIndex = hastableKeys.length ? parseInt(hastableKeys[hastableKeys.length - 1]) + 1 : 0

        /**
         * * get all the occupied positions on x and y {x:...,y:...}
         */
        let occupiedPositions = [];
        Object.keys(this.visibleWords).forEach((hastableKey) =>
            occupiedPositions.push({
                x: parseInt(this.visibleWords[hastableKey].htmlElem.style.left),
                y: parseInt(this.visibleWords[hastableKey].htmlElem.style.top)
            })
        );

        const word = new Word(wordLabel, wordSpeed, wordIndex, occupiedPositions);
        if (word.canNotDraw) return
        this.visibleWords[wordIndex] = word;
    }

    /**
     * * deleteWord()
     * * deletes a word from the game
     */
    this.deleteWord = function (wordIndex) {
        const word = this.visibleWords[wordIndex];
        /**
         * * 1. Clear interval
         * * 2. Delete element from DOM
         * * 3. Delete element from the hashtable
         */
        clearInterval(word.wordAnimation)
        word.htmlElem.remove();
        delete this.visibleWords[wordIndex]
    }


    /**
     * * saveMax()
     * * if the current score > max score than save it
     */
    this.saveHighScore = function () {
        let highScore = localStorage.highScore;
        if (!highScore) localStorage.highScore = this.totalPoints;
        else if (this.totalPoints > highScore) localStorage.highScore = this.totalPoints;
    }

    /**
     * * getHighScore()
     * * return highScore
     */
    this.getHighScore = () => localStorage.highScore


    /**
     * * playAgain()
     * * resume playGameInterval -> trigger playGame
     */
    this.playAgain = function () {
        /**
         * * 1. Reset progrest( words, level, changeGameLevel, typedWord, lives, wordsColor)
         * * 2. Delete current words from the dome
         * * 3. Hide Game over container
         * * 4. Run drawHearts()
         * * 5. Run drawTypedWard
         * * 6. Run playGame() 
         * * 
         */
        this.gameLevel = 0;
        this.totalPoints = -1;
        this.nextLevel();
        this.addPoint();
        this.typedWord = '';
        this.lives = this.gameSettings.lives
        document.querySelector("#matched-words-container").style.color = '#fff'


        this.wordsContainer.innerHTML = null;

        document.querySelector("#game-over-container").classList.add('display-none')
        this.drawTypedWord(this.typedWord);
        this.drawHearts();

        this.playGame();

    }
    /** 
     * * gameOver()
     * * the login when the game is over
     */
    this.gameOver = function () {
        /**
         * * save score in local storage if is > max score & show it
         */
        this.saveHighScore()
        this.highScoreHTML.innerHTML = this.getHighScore();
        /**
         * * stop all animations
         */
        clearInterval(this.playGameInterval)
        Object.keys(this.visibleWords).map((hastableKey) => {
            clearInterval(this.visibleWords[hastableKey].wordAnimation)
        })
        /**
         * * show game over container
         */
        document.querySelector("#game-over-container").classList.remove('display-none')
    }

    /**
     * * removeLife()
     * * remove a life when a word get out of bounds
     */
    this.removeLife = function () {
        const heartsContainer = document.querySelector("#hearts-container");

        /**
         * * remove a live from both UI and model
         */
        this.lives--;
        heartsContainer.children[heartsContainer.children.length - 1].remove();

        if (this.lives == 0) this.gameOver();
    }

    /**
     * * wordOut()
     * * this function does the loginc when a word leave the canvas
     * @param wordIndex - the index of the word inside this.visibleWords
     */
    this.wordOut = function (wordIndex) {
        this.deleteWord(wordIndex);
        this.removeLife();
    }

    /**
     * * drawTypedWord()
     * * draw the word that the user is currently t
     */
    this.drawTypedWord = function (word) {
        const container = document.querySelector("#typedWord");
        /** 
         * * remove the current word
         */
        container.innerHTML = '';
        /**
         * * split the word into an array and build a <span> for each one
         */
        word.split('').forEach((letter) => {
            const span = document.createElement('span'),
                textNode = document.createTextNode(letter);

            span.append(textNode);
            container.append(span)
        })
    }

    /**
     * * addPoint
     * * add new point when the user type a word
     */
    this.addPoint = function () {
        this.totalPoints++;
        /**
         * * if the current score > highScore then show this to user only once
         */
        if ((this.totalPoints > this.getHighScore()) && !this.shownBeatHighScore) {
            document.querySelector("#matched-words-container").style.color = '#ff4da6'
            this.shownBeatHighScore = true;
        }

        document.querySelector("#matched-words-count").innerHTML = this.totalPoints;

        this.checkForNextLevel();
    }

    /**
     * * checkForWord()
     * * this function takes the word that the user wrote and check if the word is matching with any word inside the visibleWords hastable
     */
    this.checkForWord = function (typedWord) {
        let hashTableKeys = Object.keys(this.visibleWords);
        for (let i = 0; i < hashTableKeys.length; i++) {
            let index = hashTableKeys[i];
            const word = this.visibleWords[index];
            if (typedWord == word.wordLabel) {
                /**
                 * * 1. Empty the typed word
                 * * 2. Remove the word
                 * * 3. Add new point
                 */
                this.drawTypedWord(this.typedWord = '');
                this.deleteWord(index);
                this.addPoint();
                break;
            }
        }
    }


    /**
     * * handleUserInput()
     * * get what user types and draw the word & check if there is any match
     */
    this.handleUserInput = function (e) {
        const key = e.key,
            alphaNumericValues = /^[a-z0-9',._-]$/i;

        let letterIsOk = false;
        switch (key) {
            /**
             * * delete a letter
             */
            case "Backspace":
                e.preventDefault();
                let lettersArr = this.typedWord.split('')
                lettersArr.pop();
                this.typedWord = lettersArr.join('');
                break;
            /**
             * * delete all the letters
             */
            case "Escape":
                e.preventDefault();
                this.typedWord = '';
                break
            /**
             * * prevent default SPACE tab 
             */
            case " ":
                e.preventDefault();
            default:
                if (alphaNumericValues.test(key))
                    letterIsOk = true;
        }
        /**
         * * add the letter
         */
        if (letterIsOk) {
            this.typedWord += key;
        }
        this.drawTypedWord(this.typedWord)
        this.checkForWord(this.typedWord)
    }

    /**
     * * drawHearts()
     * * draw hearts on the UI so the user will know how many lives has
     */
    this.drawHearts = function () {
        const container = document.querySelector("#hearts-container");

        for (let i = 0; i < this.lives; i++) {
            const heartImg = document.createElement('img');
            heartImg.setAttribute('src', './images/heart.png');
            heartImg.setAttribute('alt', 'Live');
            container.append(heartImg);
        }
    }


    /**
     * * playGame()
     * * gane interval for adding new words
     */
    this.playGame = function () {
        const maxWords = this.availableWords.length,
            randomNr = Math.ceil(Math.random() * maxWords),
            randomWord = this.availableWords[randomNr],
            levelSettings = this.gameSettings.levels[this.gameLevel];

        this.addWord(randomWord, levelSettings.wordSpeed)
        if (this.changeGameLevel) {
            this.changeGameLevel = false;
            clearInterval(this.playGameInterval);

            this.playGameInterval = setInterval(() => {
                this.playGame();
            }, levelSettings.newWordTimeInterval)

        }
    }

    /**
     * * nextLevel()
     * * used to increase or to ceil the game difficulty
     */
    this.nextLevel = function () {
        /** 
         * * if the gameLevel == maxLevel then ceil the game difficulty
         */
        if (this.gameLevel > this.maxLevel - 1) return

        this.changeGameLevel = true;
        this.gameLevel++;
        document.querySelector('#level').innerHTML = this.gameLevel
    }

    /**
     * * checkForNextLevel
     * * increase the game difficulty based on total number of points
     */
    this.checkForNextLevel = function () {
        const levelSettings = this.gameSettings.levels[this.gameLevel]
        if (this.totalPoints >= levelSettings.pointsForNextLevel)
            this.nextLevel();
    }

    this.showHeader = function () {
        document.querySelector('header').classList.remove('display-none')
    }

    /**
     * * init()
     * * get the words & settings & draw the hearts & show header and add the keydown event listener
     */
    this._init_ = function () {
        this.getWords();
        this.getSettings();
        this.drawHearts();
        this.showHeader()
        document.addEventListener('keydown', (e) => {
            this.handleUserInput(e);
        })
    }

    this._init_();
}

/**
 * * UI modules
 */
const UI = (function () {
    const toggleMenu = (show) => {
        let container = document.querySelector("menu")
        if (show) container.classList.remove('display-none')
        else container.classList.add('display-none')
    }

    const toggleInstructions = (show) => {
        let container = document.querySelector("#instructions-container")
        if (show) container.classList.remove('display-none')
        else container.classList.add('display-none')
    }

    /**
     * * backToMenu()
     * * reset all and go back to initial state
     */
    const backToMenu = () => {

    }

    return {
        toggleMenu,
        toggleInstructions,
        backToMenu
    }
})();


/**
 * * Main
 */
(function () {
    /**
     * * addEvents
     */
    document.querySelector("#play-game-btn").addEventListener('click', function () {
        UI.toggleMenu(false);

        let game = new Game('en');

        game.getHighScore ? null : this.saveHighScore();
        game.wordsContainer.addEventListener('wordOut', (data) =>
            game.wordOut(data.detail.wordIndex)
        );

        document.querySelector("#play-again-btn").addEventListener('click', () => game.playAgain())

        game.playGame();
    })
    document.querySelector("#instructions-btn").addEventListener('click', function () {
        UI.toggleMenu(false);
        UI.toggleInstructions(true);
    })
    document.querySelector("#instructions-back-btn").addEventListener('click', function () {
        UI.toggleInstructions(false);
        UI.toggleMenu(true);
    })

})();