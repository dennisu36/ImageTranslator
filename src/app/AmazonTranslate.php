<?php

namespace App;

use App\TranslatorInterface;

/**
 * Description of AmazonTranslate
 *
 * @author jaywalker
 */
class AmazonTranslate implements TranslatorInterface {

    public function getTranslation($translatorInput = []) {

        //TODO FIXME this is just stub code so we can test front-end functionality
        //Swap all the 'text' keys for 'translated_text' keys so we can just render what we found
        foreach ($translatorInput as $translateKey => $translateBlock) {
            $translatorInput[$translateKey]['translated_text'] = $translateBlock['text'];
            unset($translatorInput[$translateKey]['text']);
        }
        return $translatorInput; //just send back what we received
    }
}
