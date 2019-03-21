<?php
		require '../../vendor/autoload.php';
                use Aws\Translate\TranslateClient;
                use Aws\Exception\AwsException;

class Translator
{
/*

	public function convertLanguageToAbbrev($translatorInput){
		switch($translatorInput[0]['source_language']){
			case "english":
				echo "ENGLISH!";
				break;
			case "spanish":
				$translatorInput[0]['source_language'] = 'es';
				break;
			default:
				echo "Not a suitable Language";
		}
		return $translatorInput;



	}
*/


	public function getTranslation($translatorInput) {


	        //echo "test1\n";
	        //include 'converting.php';
	        //echo "\n";

		/**
		 * Translate a text from Arabic (ar), Chinese (Simplified) (zh)
		 * French (fr), German (de), Portuguese (pt), or Spanish (es)
		 * into English (en) with Translate client.
		 *
		 * This code expects that you have AWS credentials set up per:
		 * https://docs.aws.amazon.com/sdk-for-php/v3/developer-guide/guide_credentials.html
		*/
		//Create a Translate Client


		$client = new Aws\Translate\TranslateClient([
		    'profile' => 'default',
		    'region' => 'us-east-2',
		    'version' => '2017-07-01'
		]);


		for($i=0;$i<count($translatorInput);$i++){
			$currentLanguage = $translatorInput[$i]['source_language'];
			$targetLanguage = $translatorInput[$i]['destination_language'];
			$textToTranslate = $translatorInput[$i]['text'];
		}
		// If the TargetLanguageCode is not "en", the SourceLanguageCode must be "en".
		//$targetLanguage= 'en';


		//$textToTranslate = 'El AWS SDK for PHP versión 3 permite a los desarrolladores de PHP utilizar Amazon Web Services  \n';

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
