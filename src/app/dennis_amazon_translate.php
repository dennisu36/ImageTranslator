


<?php 


include("translator.php");
class CallTranslatorClass
{

	var $translatorInput = [
		[
			'id' => 1,
			'source_language' => 'auto',
			'destination_language' => 'english',
			'text' => 'ما اسمك'
		]
	];

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


	function __Construct(){
        }

        function callTranslator($translatorIn){
                $translator = new Translator();
                $getTranslationCall = $translator->getTranslation($translatorIn);
        	return $getTranslationCall;
	}



}
$ctc = new CallTranslatorClass();
$ctc->translatorInput = $ctc->convertLanguageToAbbrev($ctc->translatorInput);

$val = $ctc->callTranslator($ctc->translatorInput);

print_r($ctc->translatorInput);
print_r($val);

?>
