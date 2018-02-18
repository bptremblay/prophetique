-- Script as at Friday, June 18, 1993 / 11:38:21 PM

-- 1 - subj w/o articles
-- 2 - subj w/articles
-- 3 - sing V
-- 4 - plur V
-- 5 - adv
-- 6 - conj
-- 7 - indir
-- 8 - obj w/o articles
-- 9 - adj
-- 10- obj w/articles
-- 11- prep
-- 12- prePhrase

-- -- -- Master Controllers -- -- -- -- --
function genSimple vocH
  put empty into cft
  put simple(random(2), random(2), random(4), vocH) after cft
  if random(3) = 1 then
    put conj(vocH) after cft
    if last word of cft = "or" then put "either " before cft
    put simple(random(2), random(2), random(4), vocH) after cft
  end if
  return cft
end genSimple

-- -- -- Grammatical Phrase Rules: -- -- -- --
function simple spx, isThe, tense, vocab
  put empty into sentence
  put empty into pWord
  if spx <> 1
  then
    put "s" into spz
  else
    put "p" into spz
  end if
  put someNoun(vocab, spz, pWord) into pWord
  put pWord & " " after sentence
  --  put someAdv(vocab) & " " after sentence
  if tense = 2
  then
    put someVerb(vocab, "p") into testV
    if testV = "is" or testV = "are"
    then
      put "will be" & " " after sentence
    else
      put "will" && testV & " " after sentence
    end if
  else
    put someVerb(vocab, spz) into testV
    put testV & " " after sentence
  end if
  if testV = "is" OR testV = "are"
  then
    if random(2) = 1
    then
      put someAdj(vocab) after sentence
    else
      put someNoun(vocab, spz, pWord) after sentence
    end if
  else
    put someNoun(vocab, spz, pWord) after sentence
  end if
  return sentence
end simple

function conj vocab
  put " " & someConj(vocab) & " " after outPut
  return outPut
end conj


-- -- -- -- -- -- -- Engines: -- -- -- -- -- -- -- -- --

function someNoun holder, sp, prevWord
  put "user-friendly" into uExcept
  put empty into art
  put "error!" into temp
  if random(2) = 1
  then
    if prevWord is empty
    then
      put item 7 of holder into temp
    else
      put item 1 of holder into temp
    end if
  else
    if random(2) = 1
    then
      put "the " & maybe(someAdj(holder)) into art
    else
      if sp <> "p"
      then
        put "a " & maybe(someAdj(holder)) into art
      else
        put "some " & maybe(someAdj(holder)) into art
      end if
    end if
    if sp <> "s"
    then
      put item 2 of holder into temp
    else
      put item 10 of holder into temp
    end if
  end if
  repeat
    put someWord(temp) into trand
    if trand <> empty AND trand <> last word of prevWord
    then
      if sp <> "p"
      then
        if last char of trand <> "s" AND trand <> "men" AND trand <> "women" --OR trand = "fungus"
        then
          exit repeat
        end if
      else
        if last char of trand = "s" OR trand = "men" OR trand = "women" --AND trand <> "fungus"
        then
          exit repeat
        end if
      end if
    end if
  end repeat
  if number of words in art < 2 and art is not empty
  then
    if char 1 of trand is in "aeiou" and word 1 of art = "a"
    then
      if trand <> uExcept
      then
        put "an" into word 1 of art
      end if
    end if
  else
    if char 1 of word 2 of art is in "aeiou" and word 1 of art = "a"
    then
      put "an" into word 1 of art
    end if
  end if
  return art & trand
end someNoun

function someVerb holder, sp
  
  if sp <> "p"
  then
    put item 3 of holder into temp
  else
    put item 4 of holder into temp
  end if
  repeat
    
    put someWord(temp) into trand
    if trand <> empty then exit repeat
  end repeat
  return trand
end someVerb

function someConj holder
  
  put item 6 of holder into temp
  repeat
    
    
    put someWord(temp) into trand
    if trand <> empty then exit repeat
  end repeat
  return trand
end someConj

function someAdj holder
  
  put item 9 of holder into temp
  repeat
    
    
    put someWord(temp) into trand
    if trand <> empty then exit repeat
  end repeat
  return trand
end someAdj

-- -- -- -- -- Utilities: -- -- -- -- -- -- --
function maybe input
  if random(2) = 1
  then
    return input & " "
  else
    return empty
  end if
end maybe




function someWord holder -- Dummy for someWord
  repeat
    set cursor to busy
    put line (random(number of lines in holder)) of holder into trand
    if trand <> empty then exit repeat
  end repeat
  set cursor to 4
  return trand
end someWord

function makeSent input
  put numToChar(charToNum(char 1 of input)-32) into char 1 of input
  put "." after input
  return noCRs(input)
end makeSent

function noCRs input
  put replaceChar (input, numToChar(13), " ") into temp
  put replaceChar (temp, "+", " ") into temp
  return temp
end noCRs  

function replaceChar input, test, replace
  put  the number of chars in input into zen
  repeat with c = 1 to zen
    put char c of input into biffy
    if charToNum(biffy) = charToNum(test) then
      
      --put string(c) && "hit" into field "output"
      put replace into char c of input
    else
      -- put biffy && test into field "output"
    end if
  end repeat
  return input
end  replaceChar