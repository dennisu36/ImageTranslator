<?php 
		require '../../vendor/autoload.php';
                use Aws\Translate\TranslateClient;
                use Aws\Exception\AwsException;



class CallTranslatorClass
{
	//Testing this array. Will take input eventually.
        var $translatorInput = [
                [
                        'id' => 1,
                        'source_language' => 'auto',
                        'destination_language' => 'english',
                        'text' => 'ما اسمك'
                ]
        ];
	//This function's purpose is to abbreviate the language names as that is what the API takes. 
         public function convertLanguageToAbbrev($translatorIn){

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
                        'turkish' => 'tr'
                ];

		//Checks to see what the languages are. If auto is the initial language, it will keep it as auto.
		//Otherwise, it will call the $languageConversion above to change the source language and the 
		//destination language.
                for($i = 0; $i < count($translatorIn);$i++){
                        if($translatorIn[$i]['source_language']== 'auto'){
                                $translatorIn[$i]['destination_language'] = $languageConversion[$translatorIn[$i]['destination_language']];
                                return $translatorIn;
                        }
                        else{
                                $translatorIn[$i]['source_language'] = $languageConversion[$translatorIn[$i]['source_language']];
                                $translatorIn[$i]['destination_language'] = $languageConversion[$translatorIn[$i]['destination_language']];
                                return $translatorIn;
                        }
                }

       }
	//Constructor
	function __Construct(){
	}

	//This function gets the php array into the API and translates the text. Also returns the text in the end //print line
        public function getTranslation($translatorIn) {


                $client = new Aws\Translate\TranslateClient([
                    'profile' => 'default',
                    'region' => 'us-east-2',
                    'version' => '2017-07-01'
                ]);

		//Puts everything into simple variable names to then send to the API
                for($i=0;$i<count($translatorIn);$i++){
                        $currentLanguage = $translatorIn[$i]['source_language'];
                        $targetLanguage = $translatorIn[$i]['destination_language'];
                        $textToTranslate = $translatorIn[$i]['text'];
                }
                // If the TargetLanguageCode is not "en", the SourceLanguageCode must be "en$
                //$targetLanguage= 'en';

		//Calls the API Client with the proper input for it to be able to translate the text with the current
		//language and the target language. 
                try {
                    $result = $client->translateText([
                        'SourceLanguageCode' => $currentLanguage,
                        'TargetLanguageCode' => $targetLanguage,
                        'Text' => $textToTranslate,
                    ]);

                //   var_dump($result);

                }catch (AwsException $e) {
                    // output error message if fails
                    echo $e->getMessage();
                    echo "\n";
                }

                //print
                echo $result['TranslatedText'];
                return $result['TranslatedText'];

        }

}
//Calling the class
$ctc = new CallTranslatorClass();
$ctc->translatorInput = $ctc->convertLanguageToAbbrev($ctc->translatorInput);

$val = $ctc->getTranslation($ctc->translatorInput);
?>



