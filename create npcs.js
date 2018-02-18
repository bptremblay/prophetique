//
//osMakeNotecard example
//By Tom Earth

default {
    touch_start(integer n) {



        list npcShortNames = [
"Zlmar",
"Kimalda",
"Ralf",
"Comilla",
"Hene",
"Rim",
"Denald",
"Kit",
"Lank",
"Kran",
"Desmar",
"Selma",
"Kim",
"Kimronta",
"George",
"Krystal",
"Charli",
"Heemskirk",
"Kmgro-gin",
"Sstama",
"Humphry",
"Kinto",
"Slidron",
"Krans",
"Trudi",
"Hans",
"Barl",
"Krgghkk",
"Scred",
"Hlen",
"Hamlis",
"Timlineha",
"Thadeus"
];

        npcShortNames = [
"Zlmar",
"Kimalda",
"Ralf",
"Comilla",
"Jozek",
"Kimronta",
"Heemskirk",
"Kinto",
"Krans",
"Trudi",
"Hans",
"Barl",
"Scred",
"Hlen",
"Hamlis",
"Czima"
]
        list npcs = [
    "Zlmar Climston",
    "Kimalda Clinchgreel",
    "Ralf Czinick",
    "Comilla Czinick",
    "Hene Trinsloe",
    "Rim Trinsloe",
    "Denald Stano",
    "Kit Sesma",
    "Lank Hrostin",
    "Kran Dimlan",
    "Desmar Frenton",
    "Selma Stacy",
    "Kim Tesmin",
    "Kimronta Fttlina",
    "George Tslani",
    "Krystal Tslani",
    "Charli Tinworth",
    "Heemskirk von Rimke",
    "Kmgro-gin",
    "Sstama",
    "Humphry Pindaros",
    "Kinto Leslanlin",
    "Slidron Hase",
    "Krans Himler",
    "Trudi Himler",
    "Hans Himler",
    "Barl Himler",
    "Krgghkk",
    "Scred Hazleen",
    "Hlen Trinton",
    "Hamlis Grastone",
    "Timlineha Raspin",
    "Thadeus Stevensa"
];

        //key id = llDetectedKey(0);
        //string name = llKey2Name(id);
        list contents; //The variable we are going to use for the contents of the notecard.
        //contents += ["Name: " + name + "\n"];
        //contents += ["Key: " + (string) id + "\n"];
        //contents += ["Pos: " + (string) llDetectedPos(0) + "\n"];
        //contents += ["Rotation: " + (string) llDetectedRot(0) + "\n"];

        //block statement
        integer index = 0;
        integer length = llGetListLength(npcShortNames);
        for (index = 0; index < length; index++) {
            llOwnerSay((string) index);
        }

        //osMakeNotecard(name, contents); //Makes the notecard.

        //llGiveInventory(id, name); //Gives the notecard to the person.
        //llRemoveInventory(name);
    }
}