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

function getItem(input, which){
	return input.split(',')[which-1];
}

function getLine(input, which){
	return input.split('\n')[which-1];
}

function getWord(input, which){
// fixme: only works with space
	return input.split(' ')[which-1];
}

function lastWord(input){
// fixme: only works with space
var words = input.split(' ');
	return words[words.length-1];
}

// // // Master Controllers // // // // --
function genSimple (vocH) {
  //put '' into cft
 var cft == simple(random(2), random(2), random(4), vocH);
 if (random(3) == 1 ) {
    cft += conj(vocH);
    //if last word of cft = "or" then put "either " before cft
   if (lastWord(cf) == "or"){
     cft = "either " + cft;
    }
    cft += simple(random(2), random(2), random(4), vocH);
  } // end if
  return cft;
} // end genSimple

// // // Grammatical Phrase Rules: // // // --
function simple (spx, isThe, tense, vocab) {
  put '' into sentence
  put '' into pWord
 if (spx != 1
) {
    put "s" into spz
} else {
    put "p" into spz
  } // end if
  put someNoun(vocab, spz, pWord) into pWord
  put pWord + " " after sentence
  //  put someAdv(vocab) + " " after sentence
 if (tense == 2
) {
    put someVerb(vocab, "p") into testV
   if (testV == "is" or testV == "are") {
      put "will be" + " " after sentence
   } else {
      put "will" && testV + " " after sentence
    } // end if
} else {
    put someVerb(vocab, spz) into testV
    put testV + " " after sentence
  } // end if
 if (testV == "is" OR testV == "are"
) {
   if (random(2) == 1
  ) {
      put someAdj(vocab) after sentence
  } else {
      put someNoun(vocab, spz, pWord) after sentence
    } // end if
} else {
    put someNoun(vocab, spz, pWord) after sentence
  } // end if
  return sentence
} // end simple

function conj (vocab) {
  var outPut =  " " + someConj(vocab) + " ";
  return outPutl
} // end conj


// // // // // // // Engines: // // // // // // // // --

function someNoun (holder, sp, prevWord) {
  var uExcept = "user-friendly" ;
  var art = '';
  var temp = "error!" ; 
 if (random(2) == 1) {
   if (prevWord == '') {
      //put item 7 of holder into temp
      temp = getItem(holder, 7);
  } else {
      //put item 1 of holder into temp
      temp = getItem(holder, 1);
    } // end if
} else {
   if (random(2) == 1) {
      art = "the " + maybe(someAdj(holder));
  } else {
     if (sp != "p") {
        art = "a " + maybe(someAdj(holder)) ;
    } else {
        art = "some " + maybe(someAdj(holder)) ;
      } // end if
    } // end if
   if (sp != "s" ) {
      temp = getItem(holder, 2);
  } else {
     temp = getItem(holder, 10);
    } // end if
  } // end if
  
  repeat
    put someWord(temp) into trand
   if (trand != '' AND trand != last word of prevWord
  ) {
     if (sp != "p"
    ) {
       if (last char of trand != "s" AND trand != "men" AND trand != "women" --OR trand == "fungus"
      ) {
          exit repeat
        } // end if
    } else {
       if (last char of trand == "s" OR trand == "men" OR trand == "women" --AND trand != "fungus"
      ) {
          exit repeat
        } // end if
      } // end if
    } // end if
  } // end repeat
  
 if (number of words in art < 2 and art == not empty
) {
   if (char 1 of trand == in "aeiou" and word 1 of art == "a"
  ) {
     if (trand != uExcept
    ) {
        put "an" into word 1 of art
      } // end if
    } // end if
} else {
   if (char 1 of word 2 of art == in "aeiou" and word 1 of art == "a"
  ) {
      put "an" into word 1 of art
    } // end if
  } // end if
  return art + trand
} // end someNoun

function someVerb (holder, sp) {
  
 if (sp != "p"
) {
    put item 3 of holder into temp
} else {
    put item 4 of holder into temp
  } // end if
  repeat
    
    put someWord(temp) into trand
   if (trand != '' then exit repeat
  } // end repeat
  return trand
} // end someVerb

function someConj (holder) {
  
  put item 6 of holder into temp
  repeat
    
    
    put someWord(temp) into trand
   if (trand != '' then exit repeat
  } // end repeat
  return trand
} // end someConj

function someAdj (holder) {
  
  put item 9 of holder into temp
  repeat
    
    
    put someWord(temp) into trand
   if (trand != '' then exit repeat
  } // end repeat
  return trand
} // end someAdj

// // // // // Utilities: // // // // // // --
function maybe (input) {
 if (random(2) == 1
) {
    return input + " "
} else {
    return empty
  } // end if
} // end maybe




function someWord (holder) { // Dummy for someWord
  repeat
     // set cursor to busy
    put line (random(number of lines in holder)) of holder into trand
   if (trand != '' then exit repeat
  } // end repeat
   // set cursor to 4
  return trand
} // end someWord

function makeSent (input) {
  put numToChar(charToNum(char 1 of input)-32) into char 1 of input
  put "." after input
  return noCRs(input)
} // end makeSent

function noCRs (input) {
  put replaceChar (input, numToChar(13), " ") into temp
  put replaceChar (temp, "+", " ") into temp
  return temp
} // end noCRs  

function replaceChar (input, test, replace) {
  put  the number of chars in input into zen
  repeat with c == 1 to zen
    put char c of input into biffy
   if (charToNum(biffy) == charToNum(test) then
      
      --put string(c) && "hit" into field "output"
      put replace into char c of input
  } else {
      // put biffy && test into field "output"
    } // end if
  } // end repeat
  return input
} // end  replaceChar