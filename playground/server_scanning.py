import cv2
from pyzbar.pyzbar import decode  # La libreria per leggere i codici
from RAIM.ipc_client import IPCClient
from RAIM.raim_command import Command
import base64
import numpy as np
import json
import argparse  # Per avviare il server
import datetime
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s', filename='pepper_benchmark.log', filemode='w')  
FAKE_DATABASE = {
    
    # --- Ricetta 1: VALIDA (per la TUA demo) ---
    "NRE123456789": {
        "tipo": "ricetta",
        "farmaco_richiesto": "Ibuprofen 400mg",
        "codice_fiscale_associato": "TRLGDI00M61A485H", # Associata al tuo CF
        "data_scadenza": "2027-10-25"
    },
    "NRE123454321": {
        "tipo": "ricetta",
        "farmaco_richiesto": "Omeprazole 20mg",
        "codice_fiscale_associato": "TRLGDI00M61A485H", # Associata al tuo CF
        "data_scadenza": "2028-10-25"
    },
    # --- Ricetta 2: SCADUTA (per mostrare un errore) ---
    "NRE987654321": {
        "tipo": "ricetta",
        "farmaco_richiesto": "Ibuprofen 400mg",
        "codice_fiscale_associato": "TRLGDI00M61A485H", # Associata al tuo CF
        "data_scadenza": "2023-10-25"
    },

    # --- Tessera Sanitaria 1: La TUA (per la demo) ---
    "TRLGDI00M61A485H": {
        "valid": True,
        "tipo": "tessera_sanitaria",
        "nome_paziente": "Giada" # Ipotizzato dal tuo CF
    },
    
    # --- Tessera Sanitaria 1: La TUA (per la demo) ---
    "BNCLGU85B02H501X": {
        "valid": True,
        "tipo": "tessera_sanitaria",
        "nome_paziente": "Luigi Bianchi" # Ipotizzato dal tuo CF
    },
    # --- Tessera Sanitaria 1: La TUA (per la demo) ---
    "80380001300308693128": {
        "valid": True,
        "tipo": "tessera_sanitaria",
        "nome_paziente": "Giada" # Ipotizzato dal tuo CF
    },

    # --- Tessera Sanitaria 2: Finta (per errore di "mismatch") ---
    "RSSMRA80A01H501U": {
        "valid": True,
        "tipo": "tessera_sanitaria",
        "nome_paziente": "Mario Rossi"
    }
}
# --- Fine Database ---


class ScanningServer:
    def __init__(self, ipc_server_host, ipc_server_port, debug=False, **kwargs):
        # Nome univoco per questo server
        self.ipc = IPCClient("scanning_service") 
        self.ipc.debug = debug
        self.ipc.set_command_listener(self.scan_listener)
        self.ipc.connect(host=ipc_server_host, port=ipc_server_port)
        print(f"Scanning Server connesso e in ascolto su {ipc_server_host}:{ipc_server_port}")



    def base64_to_cv2(self, image_data):
        # Funzione helper per convertire l'immagine
        try:
            binary_data = base64.b64decode(image_data.split(',')[1])
            array_data = np.frombuffer(binary_data, np.uint8)
            return cv2.imdecode(array_data, cv2.IMREAD_COLOR)
        except Exception as e:
            print(f"Errore decodifica base64: {e}")
            return None

    def scan_listener(self, command: Command):
        action = command.data["actions"][0]
        if action["action_type"] != "scan_image":
            return
        logging.info("Inizio scansione ")
        img_base64 = action["action_properties"]["img"]
        frame = self.base64_to_cv2(img_base64)

        if frame is None:
            response = {"success": False, "message": "Immagine non valida."}
            command_out = command.gen_response(is_successful=False, data=response)
            self.ipc.dispatch_command(command_out)
            return

        found_codes = decode(frame)
        
        if not found_codes:
            response = {"success": False, "message": "Nessun codice trovato. Avvicina di più la ricetta o la tessera."}
            logging.warning(f"ACCURATEZZA: Scansione fallita")
            command_out = command.gen_response(is_successful=False, data=response)
            self.ipc.dispatch_command(command_out)
            return

        scanned_data_str = found_codes[0].data.decode('utf-8')
        print(f"Codice trovato: {scanned_data_str}")
        logging.info(f"ACCURATEZZA: Scansione riuscita")
   
        logging.info("Scansione completata")
        code_id = None
        scanned_type = None

        # --- LOGICA DI CONTROLLO (QR o BARCODE?) ---
        try:
            data_obj = json.loads(scanned_data_str)
            code_id = data_obj.get("id")
            scanned_type = data_obj.get("tipo")
            print("Tipo scansione: QR Code JSON (Ricetta)")
        except json.JSONDecodeError:
            if len(scanned_data_str) == 16: # Codice Fiscale
                code_id = scanned_data_str
                scanned_type = "tessera_sanitaria"
                print("Tipo scansione: Codice a Barre (Tessera Sanitaria)")
            
            elif len(scanned_data_str) > 0: # Accetta altri barcode come ID generico?
                 code_id = scanned_data_str
                 scanned_type = "barcode_generico" # Tipo inventato
                 print(f"Tipo scansione: Codice a Barre Generico (Lunghezza: {len(scanned_data_str)})")
            # --- FINE AGGIUNTA ---
            else:
                response = {"success": False, "message": "Codice a barre non riconosciuto o vuoto."}
                command_out = command.gen_response(is_successful=False, data=response)
                self.ipc.dispatch_command(command_out)
                return
        # --- FINE LOGICA DI CONTROLLO ---

        # --- INIZIO LOGICA VALIDAZIONE ---
        if code_id in FAKE_DATABASE:
            # Crea una COPIA per poterla modificare senza alterare l'originale
            db_entry = FAKE_DATABASE[code_id].copy() 
            
            # Controllo 1: Il tipo scansionato corrisponde al tipo nel DB?
            if db_entry["tipo"] != scanned_type:
                msg = f"Codice valido ({code_id}), ma hai mostrato un/a {db_entry['tipo']} invece di un/a {scanned_type}."
                response = {"success": False, "scanned_id": code_id, "message": msg}
                # Qui is_successful è False perché l'utente ha mostrato la cosa sbagliata
                command_out = command.gen_response(is_successful=False, data=response) 
                print(f"Errore tipo: Atteso {scanned_type}, Trovato {db_entry['tipo']} per ID {code_id}")

            else:
                # Controllo 2: Se è una ricetta, controlla la data di scadenza
                is_logically_valid = db_entry.get("valid", True) # Default a True per tessere o se manca 'valid'

                if db_entry["tipo"] == "ricetta":
                    if "data_scadenza" in db_entry:
                        try:
                            expiration_dt = datetime.datetime.strptime(db_entry["data_scadenza"], "%Y-%m-%d").date()
                            today_dt = datetime.date.today()
                            
                            if expiration_dt < today_dt:

                                print(f"Ricetta {code_id} SCADUTA il {db_entry['data_scadenza']}")
                                is_logically_valid = False
                                db_entry["errore"] = "Ricetta scaduta." # Aggiungi messaggio di errore specifico
                            else:
                                print(f"Ricetta {code_id} valida fino al {db_entry['data_scadenza']}")
                                is_logically_valid = True # È valida (se non era già False per altri motivi)
                        
                        except ValueError:
                            print(f"!!! ERRORE: Formato data non valido per {code_id}: {db_entry['data_scadenza']}")
                            is_logically_valid = False
                            db_entry["errore"] = "Formato data ricetta non valido nel database."
                    else:
                        # Se manca la data di scadenza, la consideriamo valida? O invalida?
                        print(f"ATTENZIONE: Manca data di scadenza per ricetta {code_id}. Considerata valida.")
                        is_logically_valid = True # Decidiamo di considerarla valida

                # Aggiorna il campo "valid" nella COPIA che invieremo
                db_entry["valid"] = is_logically_valid 

                # La scansione è andata a buon fine (abbiamo letto e trovato il codice),
                # ma il contenuto potrebbe non essere valido (scaduto, ecc.)
                response = {"success": True, "scanned_id": code_id, "details": db_entry}
                # is_successful=True perché la SCANSIONE ha funzionato. Il client JS controllerà details.valid.
                command_out = command.gen_response(is_successful=True, data=response) 
                print(f"Codice {code_id} ({db_entry['tipo']}) trovato. Validità logica: {is_logically_valid}")

        else: # code_id non trovato nel FAKE_DATABASE
            response = {"success": False, "scanned_id": code_id, "message": "Codice valido, ma non riconosciuto dal nostro sistema."}
            # is_successful=False perché non abbiamo trovato il codice nel DB
            command_out = command.gen_response(is_successful=False, data=response) 
            print(f"Codice {code_id} (tipo: {scanned_type}) non trovato nel FAKE_DATABASE.")
        # --- FINE LOGICA VALIDAZIONE ---
            
        self.ipc.dispatch_command(command_out)

# ... (il blocco if __name__ == '__main__': rimane uguale) ...
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scanning Service Server')
    parser.add_argument('--ipc_server_host', type=str, default='localhost', help='IPC server hostname (default: localhost)')
    parser.add_argument('--ipc_server_port', type=int, default=5001, help='IPC server port number (default: 5001)')
    parser.add_argument('--debug', type=bool, default=False, help='Print debug infos (default: False)')
    args = vars(parser.parse_args())

    server = ScanningServer(**args)






