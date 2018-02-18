function getItem(input, which) {
    return input.trim().split(',')[which];
}

function getLine(input, which) {
    return input.trim().split('\n')[which];
}

function getWord(input, which) {
    // fixme: only works with space
    return input.trim().split(' ')[which - 1];
}

function getChar(input, which) {
    // fixme: only works with space
    return input.trim().split('')[which - 1];
}

function numToChar(num) {
    return String.fromCharCode(num);
}

function lastWord(input) {
    // fixme: only works with space
    var words = input.split(' ');
    return words[words.length - 1];
}

function random(n) {
    return Math.trunc(Math.random() * n);
}

function randomInteger(n) {
    return Math.trunc(Math.random() * n) + 1;
}


function lastWordOf(input) {
    var words = input.split(' ');
    return words.pop();
}

function lastCharOf(input) {
    var chars = input.split('');
    return chars.pop();
}

function numberOfWordsIn(input) {
    var words = input.trim().split(' ');
    return words.length;
}

function replaceOneWord(container, chunkIndex, newValue) {
    var words = container.split(' ');
    words[chunkIndex - 1] = newValue;
    return words.join(' ');
}

function lines(input) {
    return input.split('\n');
}

// Script as at Friday, June 18, 1993 / 11:38:21 PM

// 1 - subj w/o articles
// 2 - subj w/articles
// 3 - sing V
// 4 - plur V
// 5 - adv
// 6 - conj
// 7 - indir
// 8 - obj w/o articles
// 9 - adj
// 10- obj w/articles
// 11- prep
// 12- prePhrase

// // // Master Controllers // // // // //
// ORIGINAL: //function genSimple vocH
function genSimple(vocH) {
    // ORIGINAL: //  put '' into cft
    var cft;
    cft = '';
    // ORIGINAL: //  put simple(random(2), random(2), random(4), vocH) after cft
    cft += (simple(randomInteger(2), randomInteger(2), randomInteger(4), vocH));
    // ORIGINAL: //  if random(3) === 1 then
    if (randomInteger(3) === 1) {
        // ORIGINAL: //    put conj(vocH) after cft
        cft += conj(vocH);
        // ORIGINAL: //    if lastWordOf( cft === "or" then put "either " before cft
        if (lastWordOf(cft) === "or") {
            //            put "either "
            //            before cft
            cft = ' either ' + cft;
        }
        // ORIGINAL: //    put simple(random(2), random(2), random(4), vocH) after cft
        cft += (simple(randomInteger(2), randomInteger(2), randomInteger(4), vocH));
        // ORIGINAL: //  end if

    }
    return makeSent(cft);
    // ORIGINAL: //end genSimple
}

/**
 * Capitalize.
 *
 * @name capitalize
 * @method capitalize
 *            input
 * @return {string}
 * @param input
 */
function capitalize(input) {
    if (input == null) {
        return '';
    }
    input = input.split('');
    if (input.length === 0) {
        return '';
    }
    input[0] = input[0].toUpperCase();
    return input.join('');
}
/**
 * De-capitalize.
 *
 * @name decapitalize
 * @method decapitalize
 *            input
 * @return {string}
 * @param input
 */
function decapitalize(input) {
    if (input == null) {
        return '';
    }
    input = input.split('');
    if (input.length === 0) {
        return '';
    }
    input[0] = input[0].toLowerCase();
    return input.join('');
}

// // // Grammatical Phrase Rules: // // // //
// ORIGINAL: //function simple spx, isThe, tense, vocab
function simple(spx, isThe, tense, vocab) {
    // ORIGINAL: //  put '' into sentence
    var sentence;
    var testV;
    sentence = '';
    // ORIGINAL: //  put '' into pWord
    var pWord;
    pWord = '';
    // ORIGINAL: //  if spx  !==  1
    if (spx !== 1)
    // ORIGINAL: //  then
    {
        // ORIGINAL: //    put "s" into spz

        spz = "s";
        // ORIGINAL: //  else
    } else {
        // ORIGINAL: //    put "p" into spz
        spz = "p";
        // ORIGINAL: //  end if

    }
    // ORIGINAL: //  put someNoun(vocab, spz, pWord) into pWord
    pWord = (someNoun(vocab, spz, pWord));
    // ORIGINAL: //  put pWord + " " after sentence
    sentence += (pWord + " ");
    //  put someAdv(vocab) + " " after sentence
    // ORIGINAL: //  if tense === 2
    if (tense === 2)
    // ORIGINAL: //  then
    {
        // ORIGINAL: //    put someVerb(vocab, "p") into testV

        testV = (someVerb(vocab, "p"));
        // ORIGINAL: //    if testV === "is" || testV === "are"
        if (testV === "is" || testV === "are")
        // ORIGINAL: //    then
        {
            // ORIGINAL: //      put "will be" + " " after sentence
            sentence += ("will be" + " ");
            // ORIGINAL: //    else
        } else {
            // ORIGINAL: //      put "will" + ' ' + testV + " " after sentence
            sentence += ("will" + ' ' + testV + " ");
            // ORIGINAL: //    end if

        }
        // ORIGINAL: //  else
    } else {
        // ORIGINAL: //    put someVerb(vocab, spz) into testV
        testV = (someVerb(vocab, spz));
        // ORIGINAL: //    put testV + " " after sentence
        sentence += (testV + " ");
        // ORIGINAL: //  end if

    }
    // ORIGINAL: //  if testV === "is" || testV === "are"
    if (testV === "is" ||
        testV === "are")
    // ORIGINAL: //  then
    {
        // ORIGINAL: //    if random(2) === 1
        if (randomInteger(2) === 1)
        // ORIGINAL: //    then
        {
            // ORIGINAL: //      put someAdj(vocab) after sentence
            sentence += someAdj(vocab);
            // ORIGINAL: //    else
        } else {
            // ORIGINAL: //      put someNoun(vocab, spz, pWord) after sentence
            sentence += (someNoun(vocab, spz, pWord));
            // ORIGINAL: //    end if

        }
        // ORIGINAL: //  else
    } else {
        // ORIGINAL: //    put someNoun(vocab, spz, pWord) after sentence
        sentence += (someNoun(vocab, spz, pWord));
        // ORIGINAL: //  end if

    }
    return sentence;
    // ORIGINAL: //end simple
}

// ORIGINAL: //function conj vocab
function conj(vocab) {
    // ORIGINAL: //  put " " + someConj(vocab) + " " after outPut
    var outPut = '';
    outPut = (" " + someConj(vocab) + " ");
    return outPut;
    // ORIGINAL: //end conj
}


// // // // // // // Engines: // // // // // // // // //

// ORIGINAL: //function someNoun holder, sp, prevWord
function someNoun(holder, sp, prevWord) {
    // ORIGINAL: //  put "user-friendly" into uExcept
    var uExcept;
    var trand;
    uExcept = "user-friendly";
    // ORIGINAL: //  put '' into art
    var art;
    art = '';
    // ORIGINAL: //  put "error!" into temp
    var temp;
    temp = "error!";
    // ORIGINAL: //  if random(2) === 1
    if (randomInteger(2) === 1)
    // ORIGINAL: //  then
    {
        // ORIGINAL: //    if prevWord === ''
        if (prevWord === '')
        // ORIGINAL: //    then
        {
            // ORIGINAL: //      put item 7 of holder into temp
            temp = getItem(holder, 7 - 1);
            // ORIGINAL: //    else
        } else {
            // ORIGINAL: //      put item 1 of holder into temp
            temp = getItem(holder, 1 - 1);
            // ORIGINAL: //    end if

        }
        // ORIGINAL: //  else
    } else {
        // ORIGINAL: //    if random(2) === 1
        if (randomInteger(2) === 1)
        // ORIGINAL: //    then
        {
            // ORIGINAL: //      put "the " + maybe(someAdj(holder)) into art
            art = ("the " + maybe(someAdj(holder)));
            // ORIGINAL: //    else
        } else {
            // ORIGINAL: //      if sp  !==  "p"
            if (sp !== "p")
            // ORIGINAL: //      then
            {
                // ORIGINAL: //        put "a " + maybe(someAdj(holder)) into art
                art = ("a " + maybe(someAdj(holder)));
                // ORIGINAL: //      else
            } else {
                // ORIGINAL: //        put "some " + maybe(someAdj(holder)) into art
                art = ("some " + maybe(someAdj(holder)));
                // ORIGINAL: //      end if

            }
            // ORIGINAL: //    end if

        }
        // ORIGINAL: //    if sp  !==  "s"
        if (sp !== "s")
        // ORIGINAL: //    then
        {
            // ORIGINAL: //      put item 2 of holder into temp
            temp = getItem(holder, 2 - 1);
            // ORIGINAL: //    else
        } else {
            // ORIGINAL: //      put item 10 of holder into temp
            temp = getItem(holder, 10 - 1);
            // ORIGINAL: //    end if

        }
        // ORIGINAL: //  end if

    }
    if (temp.trim().length === 0) {
        debugger;
    }
    // ORIGINAL: //  repeat
    while (true) {
        // ORIGINAL: //    put someWord(temp) into trand

        trand = someWord(temp);
        if (!trand.trim()) {
            debugger;
        }
        // ORIGINAL: //    if trand  !==  '' && trand  !==  lastWordOf( prevWord
        if (trand !== '' &&
            trand !== lastWordOf(prevWord))
        // ORIGINAL: //    then
        {
            // ORIGINAL: //      if sp  !==  "p"
            if (sp !== "p")
            // ORIGINAL: //      then
            {
                // ORIGINAL: //        if lastCharOf(trand  !==  "s" && trand  !==  "men" && trand  !==  "women" //OR trand === "fungus"
                if (lastCharOf(trand) !== "s" &&
                    trand !== "men" &&
                    trand !== "women") //OR trand === "fungus") 
                // ORIGINAL: //        then
                {
                    // ORIGINAL: exit repeat
                    break;

                    // ORIGINAL: //        end if

                }
                // ORIGINAL: //      else
            } else {
                // ORIGINAL: //        if lastCharOf(trand === "s" || trand === "men" || trand === "women" //AND trand  !==  "fungus"
                if (lastCharOf(trand) === "s" ||
                    trand === "men" ||
                    trand === "women") //AND trand  !==  "fungus") 
                // ORIGINAL: //        then
                {
                    // ORIGINAL: exit repeat
                    break;

                    // ORIGINAL: //        end if

                }
                // ORIGINAL: //      end if

            }
            // ORIGINAL: //    end if

        }
        // ORIGINAL: //  end repeat

    }
//    art = 'a ';
//    trand = 'apple ';
    // ORIGINAL: //  if numberOfWordsIn( art < 2 && art === not ''
    if (numberOfWordsIn(art) === 1)
    // ORIGINAL: //  then
    {

        // ORIGINAL: //    if char 1 of trand === in "aeiou" && word 1 of art === "a"
        if ("aeiou".indexOf(getChar(trand, 1)) !== -1 && getWord(art, 1) === "a")
        // ORIGINAL: //    then
        {
            console.log('one word: ', 'article:', art.trim(), 'noun:', trand.trim());
            //debugger;
            // ORIGINAL: //      if trand  !==  uExcept
            if (trand !== uExcept)
            // ORIGINAL: //      then
            {
                // put "an" into word 1 of art
                art = replaceOneWord(art, 1, 'an');
                // ORIGINAL: //      end if

            }
            // ORIGINAL: //    end if

        }
        // ORIGINAL: //  else
    } else if (art) {

        // ORIGINAL: //    if char 1 of word 2 of art === in "aeiou" && word 1 of art === "a"
        var testChar = getChar(getWord(art, 2), 1);
        if ("aeiou".indexOf(testChar) !== -1 && getWord(art, 1) === "a")
        //if (char 1 of word 2 of art === in "aeiou" && word 1 of art === "a")
        // ORIGINAL: //    then
        {
            console.log('more than one word: ', 'article:', art, 'noun:', trand);
            //debugger;
            // put "an" into word 1 of art
            art = replaceOneWord(art, 1, 'an');
            // ORIGINAL: //    end if

        }
        // ORIGINAL: //  end if

    }
    return art + trand;
    // ORIGINAL: //end someNoun
}

// ORIGINAL: //function someVerb holder, sp
function someVerb(holder, sp) {
    var temp;
    var trand;
    // ORIGINAL: //  if sp  !==  "p"
    if (sp !== "p") {
        // ORIGINAL: //  then

        // ORIGINAL: //    put item 3 of holder into temp

        temp = getItem(holder, 3 - 1);
        // ORIGINAL: //  else
    } else {
        // ORIGINAL: //    put item 4 of holder into temp
        temp = getItem(holder, 4 - 1);
        // ORIGINAL: //  end if

    }
    //console.log('VERBS?', temp);
    // ORIGINAL: //  repeat

    while (true) {

        // ORIGINAL: //    put someWord(temp) into trand

        trand = someWord(temp);
        // ORIGINAL: //    if trand  !==  '' then 
        // ORIGINAL: exit repeat
        if (trand !== '') { // ORIGINAL: exit repeat}
            return trand;

            // ORIGINAL: //  end repeat

        }

        // ORIGINAL: //end someVerb
    }
}

// ORIGINAL: //function someConj holder
function someConj(holder) {
    var trand
    // ORIGINAL: //  put item 6 of holder into temp
    var temp;
    temp = getItem(holder, 6 - 1);
    // ORIGINAL: //  repeat
    while (true) {


        // ORIGINAL: //    put someWord(temp) into trand
        ;
        trand = someWord(temp);
        // ORIGINAL: //    if trand  !==  '' then // ORIGINAL: exit repeat
        if (trand !== '') { // ORIGINAL: exit repeat}
            return trand;

            // ORIGINAL: //  end repeat

        }

        // ORIGINAL: //end someConj
    }
}

// ORIGINAL: //function someAdj holder
function someAdj(holder) {

    // ORIGINAL: //  put item 9 of holder into temp
    var temp;
    var trand;
    temp = getItem(holder, 9 - 1);
    // ORIGINAL: //  repeat
    while (true) {


        // ORIGINAL: //    put someWord(temp) into trand

        trand = someWord(temp);
        // ORIGINAL: //    if trand  !==  '' then // ORIGINAL: exit repeat
        if (trand !== '') { // ORIGINAL: exit repeat}
            return trand;

            // ORIGINAL: //  end repeat

        }

        // ORIGINAL: //end someAdj
    }
}

// // // // // Utilities: // // // // // // //
// ORIGINAL: //function maybe input
function maybe(input) {
    // ORIGINAL: //  if random(2) === 1
    if (randomInteger(2) === 1)
    // ORIGINAL: //  then
    {
        return input + " ";
        // ORIGINAL: //  else
    } else {
        return '';
        // ORIGINAL: //  end if

    }
    // ORIGINAL: //end maybe
}




// ORIGINAL: //function someWord holder // Dummy for someWord
function someWord(holder) {
    var trand;
    // ORIGINAL: //  repeat

    var numLines = holder.trim().split('\n').length;
    while (true) {
        // set cursor to busy
        // ORIGINAL: //    put line (random(number of lines in holder)) of holder into trand

        trand = getLine(holder, random(numLines));

        // ORIGINAL: //    if trand  !==  '' then // ORIGINAL: exit repeat
        if (trand !== '') { // ORIGINAL: exit repeat}
            return trand.split('+').join(' ');

            // ORIGINAL: //  end repeat

        }
    }
    // set cursor to 4

    // ORIGINAL: //end someWord
}

// ORIGINAL: //function makeSent input
function makeSent(input) {
    //    put numToChar(charToNum(char 1 of input) - 32) into char 1 of input
    //    // ORIGINAL: //  put "." after input
    //    input += ".";
    //    return noCRs(input)
    // ORIGINAL: //end makeSent

    return capitalize(input).trim() + '.';
}

// ORIGINAL: //function noCRs input
function noCRs(input) {
    return input.split('\n').join(replace);
    //    // ORIGINAL: //  put replaceChar (input, numToChar(13), " ") into temp
    //    var temp;
    //    temp = (replaceChar(input, numToChar(13), " "));
    //    // ORIGINAL: //  put replaceChar (temp, "+", " ") into temp
    //    temp = (replaceChar(temp, "+", " "));
    //    return temp
    //    // ORIGINAL: //end noCRs
}

// ORIGINAL: //function replaceChar input, test, replace
function replaceChar(input, test, replace) {
    return input.split(test).join(replace);
    //    // ORIGINAL: //  put  the number of chars in input into zen
    //    var zen;
    //    zen = (the number of chars in input);
    //    // ORIGINAL: //  repeat with c = 1 to zen
    //    while (true) {
    //        // ORIGINAL: //    put char c of input into biffy
    //        var biffy;
    //        biffy = getChar(input, c);
    //        // ORIGINAL: //    if charToNum(biffy) === charToNum(test) then
    //        if (charToNum(biffy) === charToNum(test)) {
    //
    //            //put string(c) + ' ' + "hit" into field "output"
    //            put replace into char c of input
    //            // ORIGINAL: //    else
    //        } else {
    //            // put biffy + ' ' + test into field "output"
    //            // ORIGINAL: //    end if
    //
    //        }
    //        // ORIGINAL: //  end repeat
    //
    //    }
    //    return input
    //    // ORIGINAL: //end  replaceChar
}
