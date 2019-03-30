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
        return $translatorInput; //just send back what we received
    }
}
