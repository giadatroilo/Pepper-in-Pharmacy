






const pepper_feedback = new PepperFeedback("pepper_feeedback", "/assets/");
const video = document.getElementById(`video${config.show_video_always?"_debug":""}`);
const video_back = document.getElementById('video_back');
const label_pepper_see = document.getElementById('label_pepper_see');
const label_explanation = document.getElementById('label_pepper_see');
const prp_title = document.getElementById("prp_title");
const cropped_unk_face = document.getElementById('cropped_unk_face');
const cropped_unk_face_text = document.getElementById('cropped_unk_face_text');
const container = document.getElementById('product_image_container');
const image = document.getElementById('product_image');
        


class App {
    constructor(
        {
            min_ms_interval = 400,
            unknown_face_threshold = 4,
            chosen_one_max_threshold = 8,
            camera_type = config.camera_type,
            lang = "en-US",
            debug = true,
        }
    ) {

        this.initState();
        this.console = new BetterConsole({ enabled: debug });
        this.stt = new SpeechRecognitionBrowser(lang);
        this.languageText = new LanguageText(
            lang,
            {
                "YES": {
                    "en-US": "yes",
                    "it-IT": "si"
                },
                "NO": {
                    "en-US": "no",
                    "it-IT": "no"
                },
                "DETECT_NEW_FACES": {
                    "en-US": "Hi!",
                    "it-IT": "Ciao!"
                },
                "PEPPER_WHAT_IS_FACE_NAME": {
                    "en-US": "What is the name of this person?",
                    "it-IT": "Qual'è il nome di questa persona?"
                },
                "PEPPER_WHAT_IS_FACE_NAME_CONFIRMATION": {
                    "en-US": "So the name is %s, correct?",
                    "it-IT": "Quindi il nome è %s, corretto?"
                },
                "PEPPER_WHAT_IS_FACE_NAME_CONFIRMATION_YES": {
                    "en-US": "Ok, nice to meet you!",
                    "it-IT": "Ok, piacere di conoscerti!"
                },
                "PEPPER_WHAT_IS_FACE_NAME_CONFIRMATION_NO": {
                    "en-US": "The name is not correct? Let's retry",
                    "it-IT": "Non è corretto? Allora riproviamo"
                },
                
                 
                "PEPPER_WHAT_IS_FACE_INFO_CONFIRMATION": {
                    "en-US": "So you said %s, correct?",
                    "it-IT": "Quindi hai detto %s, corretto?"
                },
                "PEPPER_WHAT_IS_FACE_INFO_CONFIRMATION_YES": {
                    "en-US": "Ok!",
                    "it-IT": "Ok!"
                },
                "PEPPER_WHAT_IS_FACE_INFO_CONFIRMATION_NO": {
                    "en-US": "It's not not correct? Let's retry",
                    "it-IT": "Non e' corretto? Allora riproviamo"
                },

               
                "PEPPER_NO_HEAR": {
                    "en-US": "I didn't hear your response, please speak up",
                    "it-IT": "Non ho sentito la tua risposta, per favore alza la voce"
                },
                "PEPPER_LOST_CHOSEN_ONE": {
                    "en-US": "Oh no, I lost you. Come back whenever you want!",
                    "it-IT": "Oh no, ti ho perso di vista. Ritorna quando vuoi!"
                },
                "PEPPER_EXPERT_USER_INTRO": {
                    "en-US": "Welcome back %s! Do you want me to help you again?",
                    "it-IT": "Ciao di nuovo %s! Hai bisogno ancora del mio aiuto?"
                },
                "PEPPER_NEW_USER_INTRO": {
                    "en-US": "So, %s, do you need help with something?",
                    "it-IT": "%s hai bigogno di aiuto?"
                },
                "PEPPER_ASK": {
                    "en-US": "%s, do you need help with something?",
                    "it-IT": "%s, posso aiutarti con qualcosa?"
                },

                "PEPPER_ASK_AGAIN": {
                    "en-US": "%s, do you need help with something else?",
                    "it-IT": "%s, posso aiutarti con qualcos'altro?"
                },

                "PEPPER_EXPLAIN_0": {
                    "en-US": "Hi! I'm PepperPharm and I am here to help you find medications.",
                    "it-IT": "Ciao! Io sono PepperPharm e sono qui per aiutarti a trovare i farmaci."
                },
                "PEPPER_EXPLAIN_1": {
                    "en-US": "You can ask me where to find a medication, and I will tell you.",
                    "it-IT": "Puoi chiedermi dove trovare un farmaco e te lo dirò.",
                },
                "PEPPER_EXPLAIN_2": {
                    "en-US": "I can tell you if a medication requires a prescription or fiscal code.",
                    "it-IT": "Posso dirti se un farmaco richiede ricetta medica o codice fiscale."
                },
                "PEPPER_EXPLAIN_3": {
                    "en-US": "Or you can ask me about dosage, side effects and interactions!",
                    "it-IT": "O puoi anche chiedermi informazioni su dosaggio, effetti collaterali e interazioni!"
                },

                "PEPPER_START": {
                    "en-US": "Ok! What do you need?",
                    "it-IT": "Ok! Di cosa hai bisogno?"
                },

                
                "PEPPER_INTERACTION_FINISHED": {
                    "en-US": "Ok, thank you! Come back if you need some help!",
                    "it-IT": "Ok, grazie! Torna se hai bisogno di aiuto!"
                },
                "TERMS_AND_CONDITIONS": {
                    "en-US": "Before we start, I need to inform you that I will store your profile for providing personalized assistance. Do you agree to proceed?",
                    "it-IT": "Prima di iniziare, devo informarti che salverò i tuoi dati personali per fornirti assistenza personalizzata. Sei d'accordo a procedere?"
                },
                "TERMS_ACCEPTED": {
                    "en-US": "Thank you for your consent.",
                    "it-IT": "Grazie per il tuo consenso."
                },
                "TERMS_DECLINED": {
                    "en-US": "I understand, I won't store your profile.",
                    "it-IT": "Capisco, non salverò i tuoi dati personali."
                },
                
            },
            (lang) => {
                this.stt.recognition.lang = lang;
            }
        );

        this.console.log("Chosen min_ms_time:", min_ms_interval, "Chosen camera:", camera_type);

        this.min_ms_interval = min_ms_interval;
        this.unknown_face_threshold = unknown_face_threshold;
        this.CHOSEN_ONE_MAX_THRESHOLD = chosen_one_max_threshold;
        this.camera_type = camera_type;
        this.last_frame_time = Date.now();
        this.no_hear_counter = 0;

        this.pepper = new PepperClient({
            onConnect: async () => {
                try {
                    await this.pepper.stand(true);
                    this.console.log("Pepper connected.");
                }
                catch (error) {
                    this.console.error("Something went wrong on the pepper server");
                }
            }
        });
        
        this.faceRecognition = new FaceRecognitionClient({
            receiveListener: this.listenerFaceRecognition.bind(this),
            onConnect: this.initFaceRecognition.bind(this)
        });
        this.customerServiceManager = new CustomerServiceManager({
            lang: lang,
            onConnect: async () => {
                try {
                    this.console.log("Customer service connected.");
                }
                catch (error) {
                    this.console.error("Something went wrong on the story telling server");
                }
            }
        })
        this.scanningClient = new ScanningClient({ onConnect: () => { this.console.log("Scanning service connected."); }, 
        });
    }


    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    initState() {
        this.state = {
            "starting_page": "index_page",
            "camera_enabled": false,
            "camera_enabled_errors": 0,
            "chosen_one": undefined,
            "is_chosen_one_new": false,
            "cropped_unknown_faces": {},
            "new_faces": [],
            "chosen_one_threshold": 0,
            "user_consent": null,
            "explanation_completed": false,
        }

        this.routing = new Routing(this.state.starting_page);   
    }

    async askForConsent() {

        if (this.state.user_consent==null)
        {
            pepper_feedback.speak();
            label_explanation.innerText = this.languageText.get("TERMS_AND_CONDITIONS");
            await this.pepper.sayMove(
                this.languageText.get("TERMS_AND_CONDITIONS"),
                PepperClient.MOVE_NAMES.fancyRightArmCircle,
                true
            );

            while (true) {
                try {
                    pepper_feedback.hear();
                    let consent_response = await this.stt.startListening();
                    
                    if (consent_response.toLowerCase() == this.languageText.get("YES").toLowerCase()) {
                        this.state.user_consent = true;
                        pepper_feedback.speak();
                        label_explanation.innerText = this.languageText.get("TERMS_ACCEPTED");
                        await this.pepper.sayMove(
                            this.languageText.get("TERMS_ACCEPTED"),
                            PepperClient.MOVE_NAMES.happy,
                            true
                        );
                        await this.sleep(2000);
                        pepper_feedback.default();
                        return;
                    }
                    else if (consent_response.toLowerCase() == this.languageText.get("NO").toLowerCase()) {
                        this.state.user_consent = false;
                        pepper_feedback.speak();
                        label_explanation.innerText = this.languageText.get("TERMS_DECLINED");
                        await this.pepper.sayMove(
                            this.languageText.get("TERMS_DECLINED"),
                            PepperClient.MOVE_NAMES.confused,
                            true
                        );
                        await this.sleep(2000);
                        pepper_feedback.default();
                        return;
                    }
                    else {
                        pepper_feedback.speak();
                        await this.pepper.sayMove(
                            this.languageText.get("TERMS_AND_CONDITIONS"),
                            PepperClient.MOVE_NAMES.fancyRightArmCircle,
                            true
                        );
                    }
                } catch (error) {
                    this.console.error("Error getting consent:", error);
                    pepper_feedback.no_hear();
                    await this.pepper.sayMove(
                        this.languageText.get("PEPPER_NO_HEAR"),
                        PepperClient.MOVE_NAMES.confused,
                        true
                    );
                    await this.sleep(1000);
                }
            }
        }else return true
    }

    parseUser(filename) {  
        if (filename == undefined) return undefined;
        const parts = filename.split("#");
        const userObject = {
            name: parts[0],
            age: isNaN(parseInt(parts[1])) ? undefined : parseInt(parts[1]),
        };
        return userObject;
    }

    formatUser(name) {
        return `${name}`; 
    }

    async initFaceRecognition() {

        this.console.log("Face recognition connected");
        try {
            await this.faceRecognition.initFaceRecognition(this.unknown_face_threshold);
            this.console.log("Starting camera service...");
            await this.startCamera();

            if (!this.state.explanation_completed) {
                await this.explainFunctionalityToUser();
                this.state.explanation_completed = true;
            }

        } catch (error) {
            this.console.error("Something went wrong on the face recognition server");
        }
    }

    async startCamera() {
        if (this.state.camera_enabled) {
            console.log('Camera is already enabled!');
            return;
        }
        let isEnabled = false;
        switch (this.camera_type) {
            default:
                this.camera_type = "browser";
            case "browser":
                isEnabled = await this.startCameraBrowser();
                break;
            case "robot":
                isEnabled = await this.startCameraRobot();
                break;
        }
        await this.checkIfVideoIsEnabled(isEnabled);
    }

    async startCameraBrowser() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            this.console.log("Cameras discovered:", videoDevices);
            if (videoDevices.length > 0) {
                const device = videoDevices[0];
                this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: device.deviceId } });
                video.srcObject = this.cameraStream;
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    stopCameraBrowser() {
        if (this.cameraStream) {
            this.console.log("Stopping camera browser");
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null; 
        }
    }

    async startCameraRobot() {
        try {
            await this.pepper.startVideo(true);
            return true;
        } catch (error) {
            return false;
        }
    }

    async checkIfVideoIsEnabled(isEnabled) {
        if (isEnabled) {
            this.state.camera_enabled = true;
            this.console.log(`Camera ${this.camera_type} enabled!`);
            this.sendFrameCameraRequestDeltaTime();
            //await this.explainFunctionalityToUser();
        }
        else if (!isEnabled && this.camera_enabled_errors < 1) {
            this.console.error(`Camera not enabled using ${this.camera_type}, trying the other one...`);
            this.camera_enabled_errors += 1;
            if (this.camera_type == "browser") {
                this.camera_type = "robot";
                await this.startCameraRobot();
                //await this.explainFunctionalityToUser();
            } else {
                this.camera_type = "browser";
                await this.startCameraBrowser();
                //await this.explainFunctionalityToUser();
            }

        }
        else {
            this.console.error(`Camera not enabled, tried ${this.camera_enabled_errors} times`);
        }
    }

    async sendFrameCameraRequestDeltaTime() {
        
        let deltaTime = Date.now() - this.last_frame_time;
        if (deltaTime < this.min_ms_interval) deltaTime = this.min_ms_interval;
        else deltaTime = 1;
        await this.sleep(deltaTime);
        this.last_frame_time = Date.now();
        
        let isSuccessful = await this.sendFrameCameraRequest();
        this.console.log("Image frame sent.");
        if (!isSuccessful) {
            this.console.error("Image frame not sent, retrying...");
            await this.sendFrameCameraRequestDeltaTime();
        }
    }

    async sendFrameCameraRequest() {
        try {
            if (this.camera_type == "browser") {
                let imgBase64 = this.getFrameCameraBrowser();
                this.faceRecognition.sendFrame(imgBase64, false);                 return true;
            }
            else if (this.camera_type == "robot") {
                let imgBase64 = await this.pepper.takeFakeVideoFrame(true); 
                this.faceRecognition.sendFrame(imgBase64, false); 
                return true;
            }
        } catch (error) {
            return false;
        }

    }

    getFrameCameraBrowser() {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64ImageData = canvas.toDataURL('image/jpeg');
        return base64ImageData;
    }

    async listenerFaceRecognition(command) {

        if (!this.state.explanation_completed) {
            await this.sendFrameCameraRequestDeltaTime();
            return;
        }


        if (["known_faces", "cropped_unknown_faces"].every(key => command.data.hasOwnProperty(key))) {
            let known_faces_names = Object.keys(command.data["known_faces"]);

            this.console.log("knownfaces", known_faces_names);
            this.console.log("Current chosen one:", this.state.chosen_one)
            this.console.log("Current treshold:", this.state.chosen_one_threshold)

            if (this.state.chosen_one != undefined) {
                if (known_faces_names.includes(this.state.chosen_one)) 
                    {this.state.chosen_one_threshold = 0;
                    this.console.log("chosen one still visible->threshold=0");}
                else {this.state.chosen_one_threshold += 1;
                    this.console.log("chosen one not visible->threshold+1", this.state.chosen_one_threshold)}

                if (this.state.chosen_one_threshold >= this.CHOSEN_ONE_MAX_THRESHOLD) {
                    this.console.log("threshold>8")
                    this.state.chosen_one = undefined;
                    this.state.is_chosen_one_new = false;
                    pepper_feedback.speak();
                    let message = this.languageText.get("PEPPER_LOST_CHOSEN_ONE")
                    label_explanation.innerText = message
                    await this.pepper.sayMove(
                        message,
                        PepperClient.MOVE_NAMES.confused,
                        true
                    );
                    pepper_feedback.default();
                    this.console.log("Pepper lost the chosen one!");
                    location.reload();
                }
            }
            else {
                if (known_faces_names.length > 0) {
                    let chosen_one = known_faces_names[0];
                    this.state.chosen_one = known_faces_names[0];
                    this.console.log("Setting chosen one", this.state.chosen_one)
                    if (this.state.new_faces.includes(chosen_one)) this.state.is_chosen_one_new = true;
                    //...
                // Questa funzione chiede "Hai bisogno di aiuto?"
                    let wants_help = await this.initialTalkToUser(this.state.is_chosen_one_new);

                    // Se l'utente ha detto SÌ, 'wants_help' è true.
                    // Se ha detto NO, la funzione 'finishInteraction' è già stata chiamata.
                    if (wants_help) { 
                        
                        try {
                            pepper_feedback.hear();
                            // Ora questa riga è sicura
                            let customer_answer = await this.stt.startListening(); 
                            this.console.log("Customer Answer", customer_answer);
                            pepper_feedback.default();
                            await this.startInteraction(customer_answer);
                            pepper_feedback.visible();
                        } catch (error) {
                            // Cattura l'errore di timeout e chiama la tua funzione di gestione
                            this.console.error("[App] Speech recognition fallita in listenerFaceRecognition:", error);
                            await this.handleInteractionError(); // Questa funzione farà ripartire il loop
                        }
           
                }




                }
                else if (Object.keys(command.data["cropped_unknown_faces"]).length > 0) {
                    this.console.log("PHASE UNKNOWN: adding new faces!");
                    await this.askForConsent();
                    this.routing.goToPage("new_face_page");
                    await this.setNewFacesNames(command);
                }
            }

            let out_text = "";
            if (this.state.chosen_one != undefined) {
                let user = this.parseUser(this.state.chosen_one);
                if (this.state.is_chosen_one_new) out_text = this.languageText.get("PEPPER_ASK").replace('%s', user.name);
                else out_text = this.languageText.get("PEPPER_EXPERT_USER_INTRO").replace('%s', user.name);
            }
            else {
                out_text = this.languageText.get("DETECT_NEW_FACES")
            }
            label_pepper_see.innerText = out_text;
        }

        await this.sendFrameCameraRequestDeltaTime();
    }


    async setNewFacesNames(command) {
        const objList = [];
        for (const key in command.data["cropped_unknown_faces"]) {
            const value = command.data["cropped_unknown_faces"][key];
            const pair = [key, value];
            objList.push(pair);
        }
        await this.setNewFaceName(command, objList, 0);
    }
    async getFaceInfo(
        languageTextPhrase, pepperClientMoveName,
        languageTextConfirmation,
        languageTextConfirmationYes, languageTextConfirmationNo
    ) {
        while (true) {
            try {
                cropped_unk_face_text.innerText = this.languageText.get(languageTextPhrase)
                pepper_feedback.speak();
                await this.pepper.sayMove(
                    this.languageText.get(languageTextPhrase),
                    pepperClientMoveName,
                    true
                );
                pepper_feedback.hear();
                let info_text = await this.stt.startListening();

                let conf_text = this.languageText.get("PEPPER_WHAT_IS_FACE_INFO_CONFIRMATION").replace('%s', info_text);
                cropped_unk_face_text.innerText = conf_text;
                pepper_feedback.speak();
                await this.pepper.sayMove(
                    conf_text,
                    PepperClient.MOVE_NAMES.thinking,
                    true
                );
                pepper_feedback.hear();
                let confirm_text = await this.stt.startListening();

                if (confirm_text.toLowerCase() == this.languageText.get("YES").toLowerCase()) {
                    pepper_feedback.speak();
                    cropped_unk_face_text.innerText = this.languageText.get("PEPPER_WHAT_IS_FACE_INFO_CONFIRMATION_YES");
                    await this.pepper.sayMove(
                        this.languageText.get("PEPPER_WHAT_IS_FACE_INFO_CONFIRMATION_YES"),
                        PepperClient.MOVE_NAMES.happy,
                        true
                    );
                    pepper_feedback.default();
                    return info_text;
                }
                else {
                    pepper_feedback.speak();
                    cropped_unk_face_text.innerText = this.languageText.get("PEPPER_WHAT_IS_FACE_INFO_CONFIRMATION_NO");
                    await this.pepper.sayMove(
                        this.languageText.get("PEPPER_WHAT_IS_FACE_INFO_CONFIRMATION_NO"),
                        PepperClient.MOVE_NAMES.confused,
                        true
                    );
                }
            } catch (error) {
                this.console.log("An error occurred (propbably no response)");
                this.console.error(error);
                cropped_unk_face_text.innerText = this.languageText.get("PEPPER_NO_HEAR");
                pepper_feedback.no_hear();
                await this.pepper.sayMove(
                    this.languageText.get("PEPPER_NO_HEAR"),
                    PepperClient.MOVE_NAMES.confused,
                    true
                );
                await this.sleep(500);
            }
        }
    }
    async setNewFaceName(command, objList, idx) {
        if (objList.length <= idx) {
            try {
                let command_out = await this.faceRecognition.setUnknownFaces(this.state.cropped_unknown_faces, true);
                this.console.log("Success! Setting new faces on the state...");
                this.state.new_faces = this.state.new_faces.concat(command_out.data["new_faces"]);
            } catch (error) {
                this.console.error("Error on setting the new faces:", error);
            } finally {
                this.console.log("Going back to face selection...");
                pepper_feedback.default();
                this.routing.goBack();
                return;
            }

        };
        let [key, value] = objList[idx];
        cropped_unk_face.src = value;
        
        try {
            let name_text = await this.getFaceInfo(
                "PEPPER_WHAT_IS_FACE_NAME", PepperClient.MOVE_NAMES.curious,
            );

            

            pepper_feedback.speak();
            cropped_unk_face_text.innerText = this.languageText.get("PEPPER_WHAT_IS_FACE_INFO_CONFIRMATION_YES");
            await this.pepper.sayMove(
                this.languageText.get("PEPPER_WHAT_IS_FACE_INFO_CONFIRMATION_YES"),
                PepperClient.MOVE_NAMES.happy,
                true
            );
            pepper_feedback.default();
            this.state.cropped_unknown_faces[key] = this.formatUser(name_text);
            this.state.new_faces.push(name_text);
            await this.setNewFaceName(command, objList, idx + 1);

        } catch (error) {
            this.console.log("An error occurred (propbably no response)");
            this.console.error(error);
            cropped_unk_face_text.innerText = this.languageText.get("PEPPER_NO_HEAR");
            pepper_feedback.no_hear();
            await this.pepper.sayMove(
                this.languageText.get("PEPPER_NO_HEAR"),
                PepperClient.MOVE_NAMES.confused,
                true
            );
            await this.sleep(1000);
            await this.setNewFaceName(command, objList, idx);
        }


    }

    async initialTalkToUser(newUser) {
        let user = this.parseUser(this.state.chosen_one);
        let txt = "";
        if (newUser) {
            txt = this.languageText.get("PEPPER_NEW_USER_INTRO").replace('%s', user.name);
        }
        else {
            txt = this.languageText.get("PEPPER_EXPERT_USER_INTRO").replace('%s', user.name);
        }
        label_explanation.innerText = txt;
        pepper_feedback.speak();
        await this.pepper.sayMove(
            txt,
            PepperClient.MOVE_NAMES.happy,
            true
        );
        while (true) {
            try {
                pepper_feedback.hear();
                let confirm_text = await this.stt.startListening();
                if (confirm_text.toLowerCase() == this.languageText.get("YES").toLowerCase()) {
                    this.console.log("User needs help: response yes");
                    //await this.explainFunctionalityToUser();
                    label_explanation.innerText = this.languageText.get("PEPPER_START");
                    pepper_feedback.speak();
                    await this.pepper.sayMove(
                        this.languageText.get("PEPPER_START"),
                        PepperClient.MOVE_NAMES.excited,
                        true
                    );
                    await this.sleep(500)
                    //pepper_feedback.default();
                    return true
                }
                else {
                    this.console.log("User needs help: response no");
                    await this.finishInteraction();
                }
            } catch (error) {
                this.console.error(error);
                label_explanation.innerText = this.languageText.get("PEPPER_NO_HEAR").replace('%s', user.name);
                pepper_feedback.no_hear();
                await this.pepper.sayMove(
                    this.languageText.get("PEPPER_NO_HEAR").replace('%s', user.name),
                    PepperClient.MOVE_NAMES.confused,
                    true
                );
                this.sleep(500);

                label_explanation.innerText = this.languageText.get("PEPPER_ASK").replace('%s', user.name);
                pepper_feedback.speak();
                await this.pepper.sayMove(
                    this.languageText.get("PEPPER_ASK").replace('%s', user.name),
                    PepperClient.MOVE_NAMES.curious,
                    true
                );
            }
        }
    }

    async explainFunctionalityToUser() {
        let movements = [
            PepperClient.MOVE_NAMES.happy,
            PepperClient.MOVE_NAMES.bothArmsBumpInFront,
            PepperClient.MOVE_NAMES.excited,
            PepperClient.MOVE_NAMES.fancyRightArmCircle,
            PepperClient.MOVE_NAMES.bothArmsBumpInFront,
            PepperClient.MOVE_NAMES.fancyRightArmCircle,
            PepperClient.MOVE_NAMES.excited,
        ];
        pepper_feedback.speak();
        for (let i = 0; i <= 3; i++) {
            let txt = this.languageText.get(`PEPPER_EXPLAIN_${i}`);
            console.log(`Speaking phrase ${i}: ${txt}`);
            label_explanation.innerText = txt;
            await this.pepper.sayMove(
                txt,
                movements[i % movements.length],
                true
            );
            
            await this.sleep(500);
            console.log(`Finished phrase ${i}`);
        }
        pepper_feedback.default();
        this.console.log("Asking for consent first.");
    
    }

    async startInteraction(customer_answer) {
        this.console.log("Starting interaction for:", customer_answer);
        let user = this.parseUser(this.state.chosen_one);

        try {
            // 1. Chiedi al server farmacia le info (come prima)
            const response = await this.customerServiceManager.handleCustomerQuery(customer_answer, user.name);
            console.log("[App] Risposta dal service manager:", response);

            // Controlliamo subito se la richiesta è stata capita, indipendentemente dalla disponibilità
            // Useremo l'action_type per decidere il flusso
            if (this.customerServiceManager.isResponseSuccessful(response) || 
                ['medication_unavailable', 'symptom_suggestion'].includes(response.action_type)) 
            {
                let message = this.customerServiceManager.getResponseMessage(response);
                let responseData = this.customerServiceManager.getResponseData(response);
                let product_image_path = this.customerServiceManager.getImageFromResponse(response);

                // Formatta e mostra il messaggio/immagine (come prima)
                const htmlMessage = message.replace(/\\n/g, '<br>').replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                label_explanation.innerHTML = htmlMessage;
                this.showProductImage(product_image_path);
                await this.sleep(10000)
                // Fai dire il messaggio a Pepper (come prima)
                const speechMessage = message.replace(/\*\*/g, '').replace(/\\n/g, ' ').replace(/\n/g, ' ');
                await this.pepper.sayMove(speechMessage, PepperClient.MOVE_NAMES.fancyRightArmCircle, true);

                // --- NUOVA LOGICA DI CONFERMA ---

                let proceedWithChecks = false; // Flag: dobbiamo procedere con ricetta/CF?

                // CASO 1: Mistral ha suggerito un'alternativa o un farmaco per sintomi
                if (response.action_type === 'medication_unavailable' || response.action_type === 'symptom_suggestion') {
                    this.console.log(`Azione: ${response.action_type}. Chiedo conferma utente.`);
                    
                    const suggestedDrugName = responseData.generic_alternatives; 
                    
                            
                    await this.sleep(1000); // Pausa

                    // Chiedi conferma all'utente
                    let wantsSuggestion = await this.askYesNoConfirmation(
                        `I suggest ${suggestedDrugName}. Do you want to proceed?`
                    );

                    if (wantsSuggestion) {
                        this.console.log("Utente ha accettato il suggerimento.");
                        proceedWithChecks = true; // Sì, controlla ricetta/CF per il suggerito
                    } else {
                        this.console.log("Utente ha rifiutato il suggerimento.");
                        proceedWithChecks = false; // No, non fare nulla, passa ad 'askForMoreHelp'
                    }

                // CASO 2: Info su farmaco specifico (disponibile o meno, ma senza suggerimento attivo)
                } else if (response.action_type === 'medication_info' || response.action_type === 'medication_unavailable') {
                     // Se è solo informativo o non disponibile (senza alternativa attiva), 
                     // procedi SE E SOLO SE è disponibile E richiede controlli.
                     // Altrimenti, se non disponibile, vai direttamente a chiedere altro aiuto.
                    if (responseData.availability > 0 && (responseData.prescription_required || responseData.fiscal_code_required)) {
                         proceedWithChecks = true; // Sì, controlla ricetta/CF
                         this.console.log("Farmaco trovato, procedo con controlli ricetta/CF.");
                    } else if (responseData.availability > 0) {
                         proceedWithChecks = false; // Farmaco disponibile ma non richiede controlli
                         this.console.log("Farmaco trovato, non richiede controlli.");
                         // Aspettiamo un po' prima di chiedere altro aiuto
                         await this.sleep(5000); 
                    }
                     else {
                         proceedWithChecks = false; // Farmaco non disponibile
                         this.console.log("Farmaco non disponibile, chiedo se serve altro.");
                         // Aspettiamo un po' prima di chiedere altro aiuto
                         await this.sleep(3000);
                    }
                }
                // Altri action_type potrebbero non richiedere controlli

                // --- FINE NUOVA LOGICA DI CONFERMA ---


                // --- LOGICA DI SCANSIONE (condizionata) ---
                let scanSuccess = true; // Default a true se non servono scansioni

                if (proceedWithChecks) {
                    const needsRecipe = responseData.prescription_required;
                    const needsFiscalCode = responseData.fiscal_code_required;

                    if (needsRecipe) {
                        this.console.log("Farmaco richiede ricetta. Avvio flusso scansione.");
                        await this.sleep(500);
                        scanSuccess = await this.handleScanningFlow(responseData);
                    } else if (needsFiscalCode) {
                        this.console.log("Farmaco richiede solo Codice Fiscale. Avvio scansione tessera.");
                        await this.sleep(500);
                        scanSuccess = await this.handleScanningFlow(responseData, true); // skipRecipeScan = true
                    } else {
                        // Non dovrebbe arrivare qui se proceedWithChecks è true, ma per sicurezza
                        this.console.log("Farmaco marcato per controllo ma non richiede né ricetta né CF?");
                        scanSuccess = true; 
                    }
                } else {
                     this.console.log("Nessun controllo ricetta/CF necessario per questa risposta.");
                }
                // --- FINE LOGICA DI SCANSIONE ---


                // Chiedi se serve altro SOLO se la scansione è andata bene (o non era necessaria)
                if (scanSuccess) {
                    await this.sleep(1000); // Breve pausa dopo l'eventuale scansione
                    await this.askForMoreHelp();
                } else {
                    // La scansione è fallita
                    this.console.log("Scansione fallita. Ritorno al menu principale.");
                    // L'errore è già stato gestito dentro handleScanningFlow/promptForScan
                    // Forse è meglio terminare o chiedere altro aiuto qui?
                    // Per ora, chiamiamo handleInteractionError per coerenza
                     await this.handleInteractionError(); // O forse finishInteraction()?
                }

            } else { // Risposta da Mistral non successful E non gestita sopra
                this.console.log("Response indicates failure:", response);
                await this.handleInteractionError();
            }

        } catch (error) { // Errore nella chiamata a handleCustomerQuery o altro
            this.console.error("[App] Errore in startInteraction:", error);
            await this.handleInteractionError();
        }
    }

    /**
     * NUOVA FUNZIONE HELPER: Fa una domanda Sì/No all'utente e gestisce l'ascolto.
     * @param {string} question - La domanda da porre.
     * @returns {Promise<boolean|null>} - True per "sì", False per "no", null se l'utente non risponde dopo tentativi.
     */
    
    async askYesNoConfirmation(question) {
        let attempts = 0;
        const maxAttempts = 2; // Riprova una volta se non capisce

        while (attempts < maxAttempts) {
            label_explanation.innerText = question;
            pepper_feedback.speak();
            await this.pepper.sayMove(
                question,
                PepperClient.MOVE_NAMES.curious, // Movimento di domanda
                true
            );

            try {
                pepper_feedback.hear();
                let answer = await this.stt.startListening();
                pepper_feedback.default();

                if (answer.toLowerCase() === this.languageText.get("YES").toLowerCase()) {
                    return true; // Utente ha detto SÌ
                } else if (answer.toLowerCase() === this.languageText.get("NO").toLowerCase()) {
                    return false; // Utente ha detto NO
                } else {
                    // Risposta non capita come sì/no
                    throw new Error("Risposta non capita."); 
                }

            } catch (error) {
                attempts++;
                this.console.error(`Errore in askYesNoConfirmation (Tentativo ${attempts}):`, error.message);
                pepper_feedback.no_hear();
                await this.pepper.sayMove(
                    this.languageText.get("PEPPER_NO_HEAR"),
                    PepperClient.MOVE_NAMES.confused,
                    true
                );
                pepper_feedback.default();
                await this.sleep(500);
                // Il loop continuerà se attempts < maxAttempts
            }
        }

        // Se siamo qui, troppi tentativi falliti
        this.console.log("Massimo tentativi raggiunti per la conferma Sì/No.");
        await this.pepper.say("I couldn't understand your answer.");
        return null; // Indica che non abbiamo ottenuto una risposta chiara
    }




    showProductImage(imagePath) {
        if (imagePath && imagePath.trim() !== '') {
            const tempImg = new Image()
            tempImg.onload = function(){
                image.src = imagePath;
                container.style.display = 'block';
                setTimeout(() => {
                    container.classList.add("show")
                    pepper_feedback.speak()},
                    100)
                }
            tempImg.onerror = function() {
                container.style.display = 'none';
                container.classList.remove('show')
                pepper_feedback.speak()
            };
            /*
            image.onload = function() {
                container.style.display = 'block';
                container.style.opacity = '0';
                container.style.transition = 'opacity 0.5s ease-in-out';
                setTimeout(() => {container.style.opacity = '1'; pepper_feedback.default()}, 10);
            };*/
            tempImg.src = imagePath;
        } else {
            container.style.display = 'none';
            container.classList.remove('show')
            pepper_feedback.speak()   
        }
    }

    async askForMoreHelp()
    {
        if (this.state.chosen_one != undefined){
            let user = this.parseUser(this.state.chosen_one);
            try
            {
                container.style.display = 'none';
                container.classList.remove('show')
                await this.sleep(500);

                let txt = this.languageText.get("PEPPER_ASK_AGAIN").replace('%s', user.name);
                label_explanation.innerText = txt;
                pepper_feedback.speak();
                await this.pepper.sayMove(
                    txt,
                    PepperClient.MOVE_NAMES.curious,
                    true
                );
                await this.sleep(500);

                pepper_feedback.hear();
                let confirm_text = await this.stt.startListening();
                if (confirm_text.toLowerCase() == this.languageText.get("YES").toLowerCase()) {
                    this.console.log("User needs help: response yes again");
                    label_explanation.innerText = this.languageText.get("PEPPER_START");
                    pepper_feedback.speak();
                    await this.pepper.sayMove(
                        this.languageText.get("PEPPER_START"),
                        PepperClient.MOVE_NAMES.excited,
                        true
                    );
                    await this.sleep(1000);

                    pepper_feedback.hear();
                    let customer_answer = await this.stt.startListening();
                    this.console.log("Customer Answer", customer_answer);
                    pepper_feedback.default();
                    await this.startInteraction(customer_answer)
                }
                else if(confirm_text.toLowerCase() == this.languageText.get("NO").toLowerCase())
                {
                    this.console.log("User finished Interaction")
                    await this.finishInteraction();
                }
            }catch(error){
                this.console.error("Error asking for more help:", error);
                await this.finishInteraction()
            }       
        }else this.finishInteraction();
       
    }

    
    async handleInteractionError() {

        this.no_hear_counter += 1; // Incrementa il contatore dei tentativi

        // Se fallisce 3 volte, si arrende e termina l'interazione
        if (this.no_hear_counter >= 10) {
            this.console.log("Troppi errori, chiusura interazione.");
            await this.finishInteraction();
            return; // Esce dalla funzione
        }
        
        this.console.log("Handling unsuccessful response (tentativo " + this.no_hear_counter + ")");
        
        // 1. Dice "Non ho sentito"
        label_explanation.innerText = this.languageText.get("PEPPER_NO_HEAR");
        pepper_feedback.no_hear();
        await this.pepper.sayMove(
            this.languageText.get("PEPPER_NO_HEAR"),
            PepperClient.MOVE_NAMES.confused,
            true
        );
    
        await this.sleep(500); // Breve pausa

        
        label_explanation.innerText = this.languageText.get("PEPPER_START");
        pepper_feedback.speak();
        await this.pepper.sayMove(
            this.languageText.get("PEPPER_START"),
            PepperClient.MOVE_NAMES.curious,
            true
        );
        await this.sleep(1000);

        // 3. Prova di nuovo ad ascoltare e avviare l'interazione
        //    (Questo è lo stesso blocco 'try/catch' di listenerFaceRecognition)
        try {
            pepper_feedback.hear();
            let customer_answer = await this.stt.startListening();
            this.console.log("Customer Answer (Retry)", customer_answer);
            pepper_feedback.default();
            await this.startInteraction(customer_answer);
            pepper_feedback.visible();
        } catch (error) {
            this.console.error("[App] Speech recognition fallita ANCHE nel tentativo:", error);
            await this.handleInteractionError(); 
        }
            }





    async finishInteraction() {

        let txt = this.languageText.get("PEPPER_INTERACTION_FINISHED");
        label_explanation.innerText = txt;
        pepper_feedback.speak();
        await this.pepper.sayMove(
            txt,
            PepperClient.MOVE_NAMES.happy,
            true
        );
        pepper_feedback.default();

        if (this.state.user_consent === false) {
            this.console.log("User had declined consent, deleting their data");
            await this.deleteUserData();
        }
        
        await this.sleep(10000)
        this.console.log("reset")
        this.state.chosen_one = undefined;
        this.state.is_chosen_one_new = false;
        location.reload();

    }

    async deleteUserData() {
        if (this.state.chosen_one) {
            try {
                await this.faceRecognition.deleteUser(this.state.chosen_one);
                this.console.log("User data deleted for:", this.state.chosen_one);
            } catch (error) {
                this.console.error("Error deleting user data:", error);
            }
    }
}


/**
     * NUOVA FUNZIONE: Gestisce l'intero flusso di scansione per ricetta e/o tessera.
     * @param {object} drugData - L'oggetto 'data' della risposta del farmaco
     * @param {boolean} skipRecipeScan - Se true, salta la ricetta e chiede solo la tessera
     * @returns {Promise<boolean>} - True se la scansione ha successo, False altrimenti.
     */
     async handleScanningFlow(drugData, skipRecipeScan = false) {
        let recipeData = null; // Salveremo qui i dati della ricetta
        let attempts = 0;
        const maxAttempts = 3;

        // --- 1. SCANSIONE RICETTA (se necessaria) ---
        if (!skipRecipeScan) {
            attempts = 0;
            while (attempts < maxAttempts) {
                try {
                    // Chiedi all'utente di scansionare la ricetta
                    const scanResponse = await this.promptForScan(
                        "Please frame the QR code on your recipe."
                    );

                    if (scanResponse.details.tipo !== 'ricetta') {
                        throw new Error("The code you have scanned is not a recipe, please try again");
                    }
                    
                    if (!scanResponse.details.valid) {
                        throw new Error(scanResponse.details.errore || "Recipe is not valid.");
                    }

                    // Successo! Salviamo i dati della ricetta e usciamo dal loop
                    recipeData = scanResponse.details;
                    this.console.log("Ricetta valida scansionata:", recipeData);
                    await this.pepper.sayMove(`Ok, I scanned the recipe for ${recipeData.farmaco_richiesto} and it is valid.`, PepperClient.MOVE_NAMES.happy, true);
                    const recipeApprovalMessage = "Ok, I scanned the recipe and it is valid.";
                    label_explanation.innerText = recipeApprovalMessage;
                    await this.sleep(5000);
                    break; // Esce dal loop while

                } catch (error) {
                    attempts++;
                    this.console.error(`Errore scansione Ricetta (Tentativo ${attempts}):`, error.message);
                    await this.pepper.say(`Error during recipe scan: your recipe is expired.`, true);
                    const errorRecipeScan = "Error during recipe scan: your recipe is expired.";
                    label_explanation.innerText = errorRecipeScan;                    
                    await this.sleep(1000);
                    if (attempts >= maxAttempts) {
                        await this.pepper.say("Try again later.");
                        label_explanation.innerText = tryAgain;
                        await this.sleep(5000);
                        return false; // Fallimento
                    }
                }
            }
        }

        // --- 2. SCANSIONE TESSERA SANITARIA (se necessaria) ---
        const needsFiscalCode = drugData.fiscal_code_required;
        if (!needsFiscalCode) {
            return true; // Non serve altro, successo!
        }
        
        // Se la ricetta è stata scansionata, usiamo il CF associato.
        // Altrimenti (es. farmaco da banco), non c'è un CF da controllare.
        const cf_da_controllare = recipeData ? recipeData.codice_fiscale_associato : null;

        if (cf_da_controllare) {
             this.console.log(`La ricetta richiede il CF: ${cf_da_controllare}`);
        }

        

// --- 2. SCANSIONE TESSERA SANITARIA (se necessaria) ---
        // ... (codice precedente per needsFiscalCode e cf_da_controllare) ...

        attempts = 0; // Resetta il contatore tentativi per la tessera

        
        while (attempts < maxAttempts) {
            this.console.log(`Starting attempt ${attempts + 1} for the Health Card.`); // LOG AGGIUNTO
            try {
                // Chiedi all'utente di scansionare la tessera
                const scanResponse = await this.promptForScan(
                    "Now, please scan the barcode on your Health Card."
                );

                // Controllo 1: È una tessera sanitaria?
                if (scanResponse.details.tipo !== 'tessera_sanitaria') {
                    this.console.log("Tipo errato scansionato (atteso: tessera_sanitaria):", scanResponse.details.tipo);
                    // Dillo all'utente
                    const wrongTypeMsg = "You scanned a code, but it doesn't look like a health card. Try again.";
                    label_explanation.innerText = wrongTypeMsg; // Aggiorna HTML
                    pepper_feedback.no_hear(); // Feedback visivo di errore
                    await this.pepper.say(wrongTypeMsg);
                    pepper_feedback.default(); // Resetta feedback
                    attempts++;
                    await this.sleep(1500); // Pausa più lunga prima di riprovare
                    continue; // Salta al prossimo tentativo
                }

                // È una tessera, prendiamo i dati
                const scanned_cf = scanResponse.scanned_id;
                const patient_name = scanResponse.details.nome_paziente;

                // Controllo 2: C'è una ricetta associata? E i CF corrispondono?
                if (cf_da_controllare && scanned_cf !== cf_da_controllare) {
                    this.console.log(`Mismatch: CF Recipe ${cf_da_controllare}, CF Card ${scanned_cf}`);
                    // Dillo all'utente
                    const mismatchMsg = `Wrong health card`;
                    label_explanation.innerText = mismatchMsg; // Aggiorna HTML
                    pepper_feedback.no_hear(); // Feedback visivo di errore
                    this.console.log("Pepper dirà:", mismatchMsg); // LOG AGGIUNTO
                    try {                        
                        await this.pepper.say(mismatchMsg, true);
                        this.console.log("Pepper ha finito di parlare (mismatch).");
                        } // LOG AGGIUNTO
                    catch (sayerror){
                        this.consol.error("Errore durante say", sayerror);
                        }
                    pepper_feedback.default(); // Resetta feedback
                    attempts++;
                    await this.sleep(500); // Pausa più lunga prima di riprovare
                    this.console.log("Continuando al prossimo tentativo dopo mismatch..."); // LOG AGGIUNTO
                    continue; // Salta al prossimo tentativo
                }

                // Se siamo qui: SUCCESSO!
                this.console.log("Valid Health Card:", scanned_cf);
                await this.pepper.sayMove(`Thank you, ${patient_name}. Valid card.`, PepperClient.MOVE_NAMES.happy, true);

                await this.sleep(500);
                const approvalMessage = "Perfect, tax code approved!";
                label_explanation.innerText = approvalMessage;
                await this.pepper.sayMove(approvalMessage, PepperClient.MOVE_NAMES.excited, true);

                return true; // Flusso completato con successo!

            } catch (error) {
                // Gestisce SOLO errori da promptForScan (Timeout o Grave)
                attempts++;
                this.console.error(`Errore scansione Tessera (Tentativo ${attempts}):`, error.message);
                label_explanation.innerText = `Error while scanning: ${error.message}`; // Mostra errore
                pepper_feedback.no_hear(); // Feedback errore
                await this.pepper.say(`Error during scanning: ${error.message}`);
                pepper_feedback.default(); // Resetta feedback
                await this.sleep(1500); // Pausa più lunga
                // Il loop continuerà automaticamente se attempts < maxAttempts
            }
        } // Fine del while

        // Se siamo usciti dal loop (3 tentativi falliti)
        this.console.log("Massimo tentativi raggiunti per la tessera sanitaria.");
        const failureMsg = "Too many failed attempts for the health card. Please try the entire process again later.";
        label_explanation.innerText = failureMsg;
        await this.pepper.say(failureMsg);
        return false; // Fallimento definitivo
 
}

    /**
     * NUOVA FUNZIONE HELPER (VERSIONE CORRETTA v2): Chiede all'utente di scansionare e gestisce l'acquisizione.
     * Lancia un errore se la scansione fallisce gravemente o scade il tempo.
     * @param {string} promptMessage - La frase che il robot deve dire.
     * @returns {Promise<object>} - La risposta valida dal server di scansione
     */
    async promptForScan(promptMessage) {
        
        label_explanation.innerText = promptMessage;
        pepper_feedback.speak();
        await this.pepper.sayMove(
            promptMessage,
            PepperClient.MOVE_NAMES.curious,
            true
        );
        
        pepper_feedback.scan(); 
        
        // Loop per 10 secondi (10 tentativi, uno al secondo)
        for (let i = 0; i < 30; i++) {
            const imgBase64 = this.getFrameCameraBrowser();
            try {
                // Invia l'immagine per la scansione
                const response = await this.scanningClient.scanImage(imgBase64, true);
                
                // --- LOGICA DI CONTROLLO RISPOSTA ---
                // Caso 1: Successo! Il server ha trovato un codice valido.
                // Controlliamo esplicitamente is_successful E data.success
                if (response.is_successful && response.data && response.data.success) {
                    this.console.log("Codice trovato e valido:", response.data);
                    pepper_feedback.default();
                    return response.data; // Ritorna i dati e interrompe la funzione
                } 
                
                // Caso 2: Risposta OK, ma nessun codice trovato o codice non nel DB.
                // Anche se is_successful potrebbe essere false, non è un errore grave.
                // Il server ci dà un messaggio in data.message.
                // Logghiamo il messaggio e continuiamo il loop.
                if (response.data && response.data.message) {
                     this.console.log(`Scan attempt ${i+1}: ${response.data.message}`);
                } else {
                     this.console.log(`Scan attempt ${i+1}: Nessun codice valido trovato.`);
                }
                // Lasciamo che il loop continui...

                // --- FINE LOGICA DI CONTROLLO ---
                
            } catch (scanError) {
                // --- GESTIONE ERRORI RAFFINATA ---
                // Questo blocco viene eseguito SOLO se la promise di scanImage viene RIFIUTATA.
                
                // Controlliamo se l'errore è un oggetto RAIMCommand (cioè una risposta con is_successful:false)
                // e se *NON* contiene data.success (il nostro server lo mette sempre)
                // Questo potrebbe indicare un errore nel server *diverso* da "codice non trovato".
                if (scanError instanceof RAIMClient.Command && (!scanError.data || typeof scanError.data.success === 'undefined')) {
                    // È una risposta negativa DAL SERVER ma non nel formato atteso o un errore interno del server.
                    // Lo trattiamo come grave.
                    this.console.error(`Errore grave (risposta server anomala) durante scan (Tentativo ${i+1}):`, scanError);
                    const serverErrorMessage = scanError?.data?.message || scanError?.data?.error || "Errore inaspettato dal servizio di scansione.";
                    pepper_feedback.default();
                    throw new Error(serverErrorMessage); 

                } else if (!(scanError instanceof RAIMClient.Command)) {
                    // È un errore diverso (es. network, JavaScript), lo trattiamo come grave.
                     this.console.error(`Errore grave (non RAIM) durante scan (Tentativo ${i+1}):`, scanError);
                     const errorMessage = scanError.message || "Errore di comunicazione con il servizio di scansione.";
                     pepper_feedback.default();
                     throw new Error(errorMessage);

                }
                // Altrimenti, se era un RAIMCommand con is_successful:false E data.success:false,
                // significa "Nessun codice trovato" o "Codice non valido".
                // In questo caso, NON facciamo nulla qui nel catch, perché la logica sopra
                // (nel blocco try) ha già gestito il messaggio e il loop continuerà.
                 if (scanError.data && scanError.data.message) {
                     this.console.log(`Scan attempt ${i+1} (catturato): ${scanError.data.message}`);
                 } else {
                      this.console.log(`Scan attempt ${i+1} (catturato): Nessun codice valido trovato.`);
                 }
                // --- FINE GESTIONE ERRORI ---
            }
            
            // Aspetta 1 secondo prima del prossimo tentativo
            await this.sleep(1000); 
        }

        // Se arriviamo qui, sono passati 10 secondi senza successo
        pepper_feedback.default();
        this.console.log("Timeout scansione dopo 10 tentativi.");
        throw new Error("Tempo scaduto. Non sono riuscito a trovare un codice valido. Assicurati che sia ben visibile.");
    }




}

(() => {
    let app = new App({});
})();





