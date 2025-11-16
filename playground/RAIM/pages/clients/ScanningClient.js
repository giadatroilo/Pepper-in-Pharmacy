class ScanningClient {

    constructor({receiveListener = (command) => {}, onConnect = () => {}, onDisconnect = () => {}}){
        // RAIM Client
        this.RAIMClient = new RAIMClient("scanningclient"); // Nome client univoco
        this.RAIMClient.debug = false;
        this.RAIMClient.setCommandListener(receiveListener);
        this.RAIMClient.onDisconnect = onDisconnect;
        
        this.RAIMClient.connect(...RAIMgetWebsocketUrlParams()).then(onConnect);
    }
    
    /**
     * Invia un frame della telecamera al server di scansione
     *
     * @param {string} img - L'immagine in base64
     * @param {boolean} request - Deve essere true per aspettare una risposta
     * @returns {Promise}
     */
    scanImage(img, request = true) {
        let command = new RAIMClient.Command({
            data: {
                "actions": [{
                    "action_type": "scan_image",
                    "action_properties": { "img": img }
                }]
            },
            to_client_id: "scanning_service", // <-- DEVE CORRISPONDERE AL SERVER PYTHON
            request: request,
        });
        return this.RAIMClient.dispatchCommand(command);
    }
}