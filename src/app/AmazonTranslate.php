<?php

namespace App;

use App\TranslatorInterface;
use Aws\Translate\TranslateClient;
use Aws\Exception\AwsException;

/**
 * Description of AmazonTranslate
 *
 * @author jaywalker
 */
class AmazonTranslate implements TranslatorInterface {
    //This function's purpose is to abbreviate the language names as that is what the API takes.
    private function convertLanguageToAbbrev($translatorIn){

        $languageConversion = [
            'arabic' => 'ar',
            'chinese' => 'zh',
            'czech' => 'cs',
            'danish' => 'da',
            'dutch' => 'nl',
            'english' => 'en',
            'finnish' => 'fi',
            'german' => 'de',
            'hebrew' => 'he',
            'indonesian' => 'id',
            'italian' => 'it',
            'japanese' => 'ja',
            'korean' => 'ko',
            'polish' => 'pl',
            'portugese' => 'pt',
            'russian' => 'ru',
            'spanish' => 'es',
            'swedish' => 'sv',
            'turkish' => 'tr',
            //TODO FIXME, not all languages are in the list.
            //UNDEFINED INDEX FRENCH
        ];

        //Checks to see what the languages are. If auto is the initial language, it will keep it as auto.
        //Otherwise, it will call the $languageConversion above to change the source language and the
        //destination language.
        for($i = 0; $i < count($translatorIn);$i++){
            if($translatorIn[$i]['source_language'] == 'auto'){
                $translatorIn[$i]['destination_language'] = $languageConversion[$translatorIn[$i]['destination_language']];
            } else{
                $translatorIn[$i]['source_language'] = $languageConversion[$translatorIn[$i]['source_language']];
                $translatorIn[$i]['destination_language'] = $languageConversion[$translatorIn[$i]['destination_language']];
            }
        }
        return $translatorIn;
    }

    //This function gets the php array into the API and translates the text. Also returns the text in the end //print line
    public function getTranslation($translatorIn = []) {

        $translatorIn = $this->convertLanguageToAbbrev($translatorIn);

        $client = new Aws\Translate\TranslateClient([
            'profile' => 'default',
            'region' => 'us-east-2',
            'version' => '2017-07-01'
        ]);

        $translationResults = [];
        foreach ($translatorIn as $key => $value) {
            $resultAry = [
                'id' => $value['id'],
                'source_language' => $value['source_language'],
                'destination_language' => $value['destination_language'],
            ];
            try {
                $resultAry['translated_text'] = $client->translateText([
                    'SourceLanguageCode' => $value['source_language'],
                    'TargetLanguageCode' => $value['destination_language'],
                    'Text' => $value['text'],
                ])['TranslatedText'];
            } catch (AwsException $e) {
                echo $resultAry['error'] = $e->getMessage();
            }
            array_push($translationResults, $resultAry);
        }
        return $translationResults;
    }
}