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
function genSimple(vocH){
// ORIGINAL: //  put '' into cft
var cft;
cft = '';
// ORIGINAL: //  put simple(random(2), random(2), random(4), vocH) after cft
cft += (simple(random(2), random(2), random(4), vocH));
// ORIGINAL: //  if random(3) === 1 then
if (random(3) === 1) {
// ORIGINAL: //    put conj(vocH) after cft
cft += conj(vocH);
// ORIGINAL: //    if last word of cft === "or" then put "either " before cft
if (last word of cft === "or") { put "either " before cft}
// ORIGINAL: //    put simple(random(2), random(2), random(4), vocH) after cft
cft += (simple(random(2), random(2), random(4), vocH));
// ORIGINAL: //  end if

}
  return cft
// ORIGINAL: //end genSimple
}

// // // Grammatical Phrase Rules: // // // //
// ORIGINAL: //function simple spx, isThe, tense, vocab
function simple(spx,isThe,tense,vocab){
// ORIGINAL: //  put '' into sentence
var sentence;
sentence = '';
// ORIGINAL: //  put '' into pWord
var pWord;
pWord = '';
// ORIGINAL: //  if spx  !==  1
if (spx  !==  1) 
// ORIGINAL: //  then
  {
// ORIGINAL: //    put "s" into spz
var spz;
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
var testV;
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
// ORIGINAL: //  if testV === "is" OR testV === "are"
if (testV === "is" OR testV === "are") 
// ORIGINAL: //  then
  {
// ORIGINAL: //    if random(2) === 1
if (random(2) === 1) 
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
  return sentence
// ORIGINAL: //end simple
}

// ORIGINAL: //function conj vocab
function conj(vocab){
// ORIGINAL: //  put " " + someConj(vocab) + " " after outPut
var outPut;
outPut += (" " + someConj(vocab) + " ");
  return outPut
// ORIGINAL: //end conj
}


// // // // // // // Engines: // // // // // // // // //

// ORIGINAL: //function someNoun holder, sp, prevWord
function someNoun(holder,sp,prevWord){
// ORIGINAL: //  put "user-friendly" into uExcept
var uExcept;
uExcept = "user-friendly";
// ORIGINAL: //  put '' into art
var art;
art = '';
// ORIGINAL: //  put "error!" into temp
var temp;
temp = "error!";
// ORIGINAL: //  if random(2) === 1
if (random(2) === 1) 
// ORIGINAL: //  then
  {
// ORIGINAL: //    if prevWord === ''
if (prevWord === '') 
// ORIGINAL: //    then
    {
// ORIGINAL: //      put item 7 of holder into temp
temp = getItem(holder,7);
// ORIGINAL: //    else
} else {
// ORIGINAL: //      put item 1 of holder into temp
temp = getItem(holder,1);
// ORIGINAL: //    end if

}
// ORIGINAL: //  else
} else {
// ORIGINAL: //    if random(2) === 1
if (random(2) === 1) 
// ORIGINAL: //    then
    {
// ORIGINAL: //      put "the " + maybe(someAdj(holder)) into art
art = ("the " + maybe(someAdj(holder)));
// ORIGINAL: //    else
} else {
// ORIGINAL: //      if sp  !==  "p"
if (sp  !==  "p") 
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
if (sp  !==  "s") 
// ORIGINAL: //    then
    {
// ORIGINAL: //      put item 2 of holder into temp
temp = getItem(holder,2);
// ORIGINAL: //    else
} else {
// ORIGINAL: //      put item 10 of holder into temp
temp = getItem(holder,10);
// ORIGINAL: //    end if

}
// ORIGINAL: //  end if

}
// ORIGINAL: //  repeat
while(true) {
// ORIGINAL: //    put someWord(temp) into trand
var trand;
trand = someWord(temp);
// ORIGINAL: //    if trand  !==  '' AND trand  !==  last word of prevWord
if (trand  !==  '' AND trand  !==  last word of prevWord) 
// ORIGINAL: //    then
    {
// ORIGINAL: //      if sp  !==  "p"
if (sp  !==  "p") 
// ORIGINAL: //      then
      {
// ORIGINAL: //        if last char of trand  !==  "s" AND trand  !==  "men" AND trand  !==  "women" //OR trand === "fungus"
if (last char of trand  !==  "s" AND trand  !==  "men" AND trand  !==  "women" //OR trand === "fungus") 
// ORIGINAL: //        then
        {
          // ORIGINAL: exit repeat
break;

// ORIGINAL: //        end if

}
// ORIGINAL: //      else
} else {
// ORIGINAL: //        if last char of trand === "s" OR trand === "men" OR trand === "women" //AND trand  !==  "fungus"
if (last char of trand === "s" OR trand === "men" OR trand === "women" //AND trand  !==  "fungus") 
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
// ORIGINAL: //  if number of words in art < 2 && art === not ''
if (number of words in art < 2 && art === not '') 
// ORIGINAL: //  then
  {
// ORIGINAL: //    if char 1 of trand === in "aeiou" && word 1 of art === "a"
if (char 1 of trand === in "aeiou" && word 1 of art === "a") 
// ORIGINAL: //    then
    {
// ORIGINAL: //      if trand  !==  uExcept
if (trand  !==  uExcept) 
// ORIGINAL: //      then
      {
        put "an" into word 1 of art
// ORIGINAL: //      end if

}
// ORIGINAL: //    end if

}
// ORIGINAL: //  else
} else {
// ORIGINAL: //    if char 1 of word 2 of art === in "aeiou" && word 1 of art === "a"
if (char 1 of word 2 of art === in "aeiou" && word 1 of art === "a") 
// ORIGINAL: //    then
    {
      put "an" into word 1 of art
// ORIGINAL: //    end if

}
// ORIGINAL: //  end if

}
  return art + trand
// ORIGINAL: //end someNoun
}

// ORIGINAL: //function someVerb holder, sp
function someVerb(holder,sp){
  
// ORIGINAL: //  if sp  !==  "p"
if (sp  !==  "p") 
// ORIGINAL: //  then
  {
// ORIGINAL: //    put item 3 of holder into temp
var temp;
temp = getItem(holder,3);
// ORIGINAL: //  else
} else {
// ORIGINAL: //    put item 4 of holder into temp
temp = getItem(holder,4);
// ORIGINAL: //  end if

}
// ORIGINAL: //  repeat
while(true) {
    
// ORIGINAL: //    put someWord(temp) into trand
var trand;
trand = someWord(temp);
// ORIGINAL: //    if trand  !==  '' then // ORIGINAL: exit repeat
if (trand  !==  '') { // ORIGINAL: exit repeat}
break;

// ORIGINAL: //  end repeat

}
  return trand
// ORIGINAL: //end someVerb
}

// ORIGINAL: //function someConj holder
function someConj(holder){
  
// ORIGINAL: //  put item 6 of holder into temp
var temp;
temp = getItem(holder,6);
// ORIGINAL: //  repeat
while(true) {
    
    
// ORIGINAL: //    put someWord(temp) into trand
var trand;
trand = someWord(temp);
// ORIGINAL: //    if trand  !==  '' then // ORIGINAL: exit repeat
if (trand  !==  '') { // ORIGINAL: exit repeat}
break;

// ORIGINAL: //  end repeat

}
  return trand
// ORIGINAL: //end someConj
}

// ORIGINAL: //function someAdj holder
function someAdj(holder){
  
// ORIGINAL: //  put item 9 of holder into temp
var temp;
temp = getItem(holder,9);
// ORIGINAL: //  repeat
while(true) {
    
    
// ORIGINAL: //    put someWord(temp) into trand
var trand;
trand = someWord(temp);
// ORIGINAL: //    if trand  !==  '' then // ORIGINAL: exit repeat
if (trand  !==  '') { // ORIGINAL: exit repeat}
break;

// ORIGINAL: //  end repeat

}
  return trand
// ORIGINAL: //end someAdj
}

// // // // // Utilities: // // // // // // //
// ORIGINAL: //function maybe input
function maybe(input){
// ORIGINAL: //  if random(2) === 1
if (random(2) === 1) 
// ORIGINAL: //  then
  {
    return input + " "
// ORIGINAL: //  else
} else {
    return ''
// ORIGINAL: //  end if

}
// ORIGINAL: //end maybe
}




// ORIGINAL: //function someWord holder // Dummy for someWord
function someWord(holder,//,Dummy,for,someWord){
// ORIGINAL: //  repeat
while(true) {
    set cursor to busy
// ORIGINAL: //    put line (random(number of lines in holder)) of holder into trand
var trand;
trand = getLine(,(random(number);
// ORIGINAL: //    if trand  !==  '' then // ORIGINAL: exit repeat
if (trand  !==  '') { // ORIGINAL: exit repeat}
break;

// ORIGINAL: //  end repeat

}
  set cursor to 4
  return trand
// ORIGINAL: //end someWord
}

// ORIGINAL: //function makeSent input
function makeSent(input){
  put numToChar(charToNum(char 1 of input)-32) into char 1 of input
// ORIGINAL: //  put "." after input
input += ".";
  return noCRs(input)
// ORIGINAL: //end makeSent
}

// ORIGINAL: //function noCRs input
function noCRs(input){
// ORIGINAL: //  put replaceChar (input, numToChar(13), " ") into temp
var temp;
temp = (replaceChar (input, numToChar(13), " "));
// ORIGINAL: //  put replaceChar (temp, "+", " ") into temp
temp = (replaceChar (temp, "+", " "));
  return temp
// ORIGINAL: //end noCRs  
}

// ORIGINAL: //function replaceChar input, test, replace
function replaceChar(input,test,replace){
// ORIGINAL: //  put  the number of chars in input into zen
var zen;
zen = (the number of chars in input);
// ORIGINAL: //  repeat with c = 1 to zen
while(true) {
// ORIGINAL: //    put char c of input into biffy
var biffy;
biffy = getChar(input,c);
// ORIGINAL: //    if charToNum(biffy) === charToNum(test) then
if (charToNum(biffy) === charToNum(test)) {
      
      //put string(c) + ' ' + "hit" into field "output"
      put replace into char c of input
// ORIGINAL: //    else
} else {
      // put biffy + ' ' + test into field "output"
// ORIGINAL: //    end if

}
// ORIGINAL: //  end repeat

}
  return input
// ORIGINAL: //end  replaceChar
}