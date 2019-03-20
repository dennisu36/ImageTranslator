<?php

namespace App;

interface TranslatorInterface
{
    /**
    * Docx
    *
    * @param array $translatorInput This array should mimic the
    *  structure of the JSON data sent to the server. For example:
    *  $translatorInput = [
    *     [
    *         'id' => 1,
    *         'source_language' => 'latin',
    *         'destination_language' => 'english',
    *         'text' => 'Bellum est malo'
    *     ]
    *  ]
    *
    * @returns array This method should return an array with the
    *  same structure as the input $translatorInput array, except
    *  the 'text' key should be replaced by a 'translated_text'
    *  key containing a string of the text translation which was
    *  fetched from an external API.
    */
    public function getTranslation($translatorInput = []);
}
