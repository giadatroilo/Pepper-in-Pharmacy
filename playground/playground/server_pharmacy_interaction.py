import os
import sys
import uuid
import tempfile
import json
import argparse
import time
import re

# Importazioni RAIM (invariate)
from RAIM.ipc_client import IPCClient
from RAIM.raim_command import Command

# Importazione MISTRAL (sostituisce openai)
from mistralai import Mistral

DIR = os.path.realpath(os.path.dirname(__file__))

# Rimosse le costanti di Azure
# Aggiunto il nome del modello Mistral
MODEL_NAME = "mistral-small-latest"

class PharmacyInteraction: # Rinominata la classe
    def __init__(self, ipc_server_host, ipc_server_port, medications_database_path, # Argomento database rinominato
                 mistral_api_key=None, debug=False, **kwargs) -> None: # Argomenti API aggiornati
        
        # ID client IPC aggiornato per la farmacia
        self.ipc = IPCClient("pharmacy_service_server") 
        self.medications_database_path = medications_database_path # Rinominato
        self.active_customers = {}
        self.ipc.debug = debug
        
        # Inizializzazione client MISTRAL (sostituisce Azure)
        self.api_key = mistral_api_key or os.getenv("MISTRAL_API_KEY")
        if not self.api_key:
            raise ValueError("MISTRAL_API_KEY non trovata. Impostala come variabile d'ambiente o tramite argomento.")
            
        self.client = Mistral(api_key=self.api_key)
        self.model_name = MODEL_NAME
        
        # Caricamento database farmaci (rinominato)
        self.medications_db = self.load_medications_database()
        
        # Rimossa la creazione dell'Assistente (logica stateless)
        # self.assistant = self._create_assistant() 
        
        print(f"Pharmacy interaction server started with Mistral model: {self.model_name}")
        self.ipc.set_command_listener(self.request_listener)
        self.ipc.connect(host=ipc_server_host, port=ipc_server_port)
        print("Connection to ipc completed!")

    # Funzione per formattare il prompt di sistema (dallo script originale della farmacia)
    def _format_system_instructions(self):
        """Prepara le istruzioni di sistema per Mistral."""
        return f"""You are Pepper, a virtual pharmacy assistant. You help customers with medication information and availability.

You have access to a medication database in JSON format:
{json.dumps(self.medications_db, indent=2, ensure_ascii=False)}

Your responsibilities:
1. Check medication availability (check "availability" field), if not available Suggest generic alternatives
2. Provide medication information (description, side effects, interactions, dosage)
3. Inform about prescription ("prescription_required") and fiscal code ("fiscal_code_required") requirements.
4. Suggest generic alternatives ("generic_alternatives") if medication is not available (availability is 0).
5. Show medication location ("location") in the pharmacy.
6. **If the customer describes a symptom (e.g., 'I have fever', 'I have headache '), use the 'keywords' field in the database to find and suggest potentially relevant medications. Always check their availability and mention requirements (prescription, fiscal code).** 


IMPORTANT RULES:
- ALWAYS inform if "prescription_required" is true.
- ALWAYS inform if "fiscal_code_required" is true.
- If availability is 0, inform the customer and ask if they want a generic alternative.
- Do not put questions in your responses unless asking about generic alternatives.
- If the client name is provided, use it in the response but not to greet them.

-Important: Set "is_successful" to true if you understood the request and found information (or lack thereof) in the database, even if the medication is unavailable (action_type 'medication_unavailable' or 'generic_alternative'). Set it to false only if you couldn't understand the request or encountered an internal error.
-When actively suggesting an alternative because the original is unavailable, you MUST use action_type: 'generic_alternative'. When suggesting a medication for a symptom, you MUST use action_type: 'symptom_suggestion'.



Your responses must be in JSON format with this structure:
{{
  "action_type": "medication_info|medication_unavailable|generic_alternative",
  "message": "message for the customer",
  "data": {{
    "name": "medication name from database",
    "location": "medication location from database",
    "price": "medication price from database",
    "availability": "availability count from database",
    "image_path": "medication image_path from database",
    "prescription_required": true/false,
    "fiscal_code_required": true/false,
    "description": "medication description",
    "side_effects": ["list of side effects"],
    "dosage_instructions": "dosage instructions",
    "interactions": ["list of interactions"]
    "generic_alternatives": ["list of the generic alternatives"]
  }},
  "is_successful": true/false
}}

Note: Respond in English."""

    # Sostituisce _get_or_create_thread. Logica più semplice solo per tracciare i clienti.
    def _get_or_create_customer_session(self, customer_id):
        """Ottiene o crea una sessione semplice per il cliente."""
        if customer_id not in self.active_customers:
            self.active_customers[customer_id] = {
                "queries_count": 0,
                "name": "Cliente"
            }
        return self.active_customers[customer_id]

    # Sostituisce _query_assistant di Azure. Logica stateless di Mistral.
    # Sostituisci la tua vecchia funzione con QUESTA
    def _query_assistant(self, customer_id, user_input, user_name, action_type=None):
        try:
            customer_session = self._get_or_create_customer_session(customer_id)
            customer_session["queries_count"] += 1
            
            system_instructions = self._format_system_instructions()
            
            user_message = f"Customer name: {user_name}. Request: {user_input}"
            messages = [
                {"role": "system", "content": system_instructions},
                {"role": "user", "content": user_message}
            ]
            response = self.client.chat.complete(
            model=self.model_name,
            messages=messages,
            stream=False
            )
            
            if response.choices and len(response.choices) > 0:
                # Estrai la risposta
                raw_response = response.choices[0].message.content
                response_text = re.sub(r"【.*?】", "", raw_response).strip()
                
                
                if response_text.startswith("```json"):
                    response_text = response_text[7:] # Rimuovi ```json
                if response_text.endswith("```"):
                    response_text = response_text[:-3] # Rimuovi ```
                
                
                response_text_cleaned = response_text.replace('\n', '').replace('\r', '')
                
                
                response_text_cleaned = response_text_cleaned.strip()

                try:
                    response_data = json.loads(response_text_cleaned)
                    return response_data, True
                except json.JSONDecodeError as e:
                    print(f"[ERRORE] Impossibile decodificare il JSON da Mistral: {e}")
                    print(f"[JSON PROBLEMATICO]: {response_text_cleaned}")
                    return {
                        "action_type": "error",
                        "message": "Ho avuto un problema tecnico. Per favore, ripeti la tua richiesta.",
                        "data": {},
                        "is_successful": False
                    }, False
            
            else:
                print("Mistral run failed: No response choices.")
                return {
                    "action_type": "error",
                    "message": "Errore tecnico. Riprova.",
                    "data": {"error": "No response from assistant"},
                    "is_successful": False
                }, False
                
        except Exception as e:
            print(f"Error querying Mistral Assistant: {e}")
            return {
                "action_type": "error",
                "message": "Errore tecnico. Riprova.",
                "data": {"error": str(e)},
                "is_successful": False
            }, False




    def shutdown(self):
        print("Shutting down the server...")
        # Rimuova la cancellazione dell'assistente (non necessario per Mistral)
        self.ipc.disconnect()

    # Funzioni database rinominate
    def load_medications_database(self):
        try:
            if os.path.exists(self.medications_database_path):
                with open(self.medications_database_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            else:
                print("JSON not found, using base database")
                return self.create_sample_database()
        except Exception as e:
            print(f"Error loading medications database: {e}")
            return self.create_sample_database()
    
    def create_sample_database(self):
        """Database di esempio per la farmacia."""
        return {
  "medications": [
    {
      "name": "Paracetamol ",
      "image_path": "images/paracetamol.jpeg",
      "prescription_required": False,
      "fiscal_code_required": True,
      "category": "Analgesic",
      "price": 3.50,
      "location": "Shelf A1",
      "availability": 10,
      "description": "Used to relieve mild to moderate pain and reduce fever.",
      "active_ingredient": "Paracetamol",
      "generic_alternatives": ["Tachipirina 500mg"],
      "side_effects": ["Nausea", "Rash", "Liver damage (high dose)"],
      "dosage_instructions": "1 tablet every 6-8 hours, max 4g per day.",
      "interactions": ["Alcohol", "Warfarin"],
      "keywords": ["pain", "fever", "paracetamol"]
    },
    {
      "name": "Tachipirina 500mg",
      "image_path": "images/tachipirina.jpeg",
      "prescription_required": False,
      "fiscal_code_required": True,
      "category": "Analgesic",
      "price": 3.50,
      "location": "Shelf A1",
      "availability": 10,
      "description": "Used to relieve mild to moderate pain and reduce fever.",
      "active_ingredient": "Paracetamol",
      "generic_alternatives": ["Paracetamol ratiopharm"],
      "side_effects": ["Nausea", "Rash", "Liver damage (high dose)"],
      "dosage_instructions": "1 tablet every 6-8 hours, max 4g per day.",
      "interactions": ["Alcohol", "Warfarin"],
      "keywords": ["pain", "fever", "paracetamol"]
    },
    {
      "name": "Amoxicillin 1g",
      "image_path": "images/amoxicillin.png",
      "prescription_required": True,
      "fiscal_code_required": True,
      "category": "Antibiotic",
      "price": 7.80,
      "location": "Shelf B2",
      "availability": 0,
      "description": "Broad-spectrum antibiotic used for bacterial infections.",
      "active_ingredient": "Amoxicillin",
      "generic_alternatives": ["Amoxicillin Sandoz", "Amoxicillin Teva"],
      "side_effects": ["Diarrhea", "Nausea", "Allergic reactions"],
      "dosage_instructions": "1 tablet every 12 hours for 7 days (as prescribed).",
      "interactions": ["Oral contraceptives", "Methotrexate"],
      "keywords": ["antibiotic", "infection", "amoxicillin"]
    },
    {
      "name": "Ibuprofen 400mg",
      "image_path": "images/ibuprofen.png",
      "prescription_required": True,
      "fiscal_code_required": True,
      "category": "NSAID",
      "price": 4.20,
      "location": "Shelf A3",
      "availability": 15,
      "description": "Nonsteroidal anti-inflammatory drug (NSAID) used to reduce pain, inflammation, and fever.",
      "active_ingredient": "Ibuprofen",
      "generic_alternatives": ["Brufen 400mg", "Ibuprofen Teva", "Paracetamol"],
      "side_effects": ["Stomach upset", "Ulcers", "Kidney issues"],
      "dosage_instructions": "1 tablet every 6-8 hours, max 1200mg daily without prescription.",
      "interactions": ["Aspirin", "Warfarin", "Alcohol"],
      "keywords": ["pain", "inflammation", "fever"]
    },
    {
      "name": "Cetirizine 10mg",
      "image_path": "images/cetirizine.jpg",
      "prescription_required": False,
      "fiscal_code_required": True,
      "category": "Antihistamine",
      "price": 5.00,
      "location": "Shelf C1",
      "availability": 15,
      "description": "Antihistamine used to relieve allergy symptoms such as sneezing, itching, watery eyes.",
      "active_ingredient": "Cetirizine",
      "generic_alternatives": ["Zyrtec", "Levocetirizine"],
      "side_effects": ["Drowsiness", "Dry mouth", "Fatigue"],
      "dosage_instructions": "1 tablet daily, preferably in the evening.",
      "interactions": ["Alcohol", "Sedatives"],
      "keywords": ["allergy", "hay fever", "antihistamine"]
    },
    {
      "name": "Omeprazole 20mg",
      "image_path": "images/omeprazol.png",
      "prescription_required": True,
      "fiscal_code_required": True,
      "category": "Proton Pump Inhibitor",
      "price": 9.50,
      "location": "Shelf D2",
      "availability": 10,
      "description": "Reduces stomach acid production, used to treat GERD and ulcers.",
      "active_ingredient": "Omeprazole",
      "generic_alternatives": ["Losec", "Omeprazole EG"],
      "side_effects": ["Headache", "Abdominal pain", "Vitamin B12 deficiency (long-term)"],
      "dosage_instructions": "1 capsule daily before breakfast.",
      "interactions": ["Clopidogrel", "Diazepam", "Warfarin"],
      "keywords": ["stomach", "acid reflux", "omeprazole"]
    },
    {
      "name": "Zyrtec 10mg",
      "image_path": "images/cetirizine.jpg",
      "prescription_required": False,
      "fiscal_code_required": True,
      "category": "Antihistamine",
      "price": 5.00,
      "location": "Shelf C1",
      "availability": 0,
      "description": "Antihistamine used to relieve allergy symptoms such as sneezing, itching, watery eyes.",
      "active_ingredient": "Cetirizine",
      "generic_alternatives": ["Cetirizine"],
      "side_effects": ["Drowsiness", "Dry mouth", "Fatigue"],
      "dosage_instructions": "1 tablet daily, preferably in the evening.",
      "interactions": ["Alcohol", "Sedatives"],
      "keywords": ["allergy", "hay fever", "antihistamine"]
    }
  ]
}




    # Funzione send_response (invariata, è perfetta)
    def send_response(self, command_in, action=None, is_successful=False):
        if command_in.request:
            command_out = command_in.gen_response(is_successful=is_successful, data=action)
        else:
            command_out = Command(
                data=action,
                to_client_id=command_in.from_client_id
            )
        print(f"Pharmacy Interaction Server responding to {command_out.to_client_id} with: {command_out.data}\n")
        self.ipc.dispatch_command(command_out)

    # Funzione request_listener (quasi invariata)
    def request_listener(self, command: Command):
        if "actions" in command.data:
            action = command.data["actions"][0]
            action_type = action["action_type"]
            action_properties = action.get("action_properties", {})

            print(f"{command.from_client_id} requesting to Pharmacy Service Server: {command.data}\n") # Nome server aggiornato

            if action_type == "quit":
                self.shutdown()
                return
            
            elif action_type == "end_interaction":
                customer_name = "Cliente"
                if command.from_client_id in self.active_customers:
                    customer_name = self.active_customers[command.from_client_id].get("name", "Cliente")
                
                farewell_message = f"Arrivederci {customer_name}!"
                response_action, is_successful = self._query_assistant(
                    command.from_client_id,
                    farewell_message,
                    customer_name, # Aggiunto customer_name (era mancante nel tuo codice)
                    "end_interaction"
                )
                
                self.send_response(command_in=command, action=response_action, is_successful=is_successful)

            else: 
                # (Rimosso 'action_type == "natural_query"')
                # Gestisce 'natural_query' e altri tipi
                user_query = action_properties.get("query", "")
                user_name = action_properties.get("user_name", "Cliente") # Default a "Cliente"
                
                response_action, is_successful = self._query_assistant(
                    command.from_client_id,
                    user_query,
                    user_name,
                    action_type or "natural_query" # Passa l'action type
                )
                
                self.send_response(command_in=command, action=response_action, is_successful=is_successful)

# Blocco __main__ aggiornato per Mistral e Farmacia
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Pharmacy Service Server with Mistral AI') # Descrizione aggiornata
    parser.add_argument('--ipc_server_host', type=str, default='localhost',
                        help='IPC server hostname (default: localhost)')
    parser.add_argument('--ipc_server_port', type=int, default=5001,
                        help='IPC server port number (default: 5001)')
    
    # Argomento database aggiornato
    parser.add_argument('--medications_database_path', type=str, 
                        default=f"{DIR}/Products/database.json", 
                        help="Path to medications database JSON file")
    
    # Argomenti API aggiornati (rimossi azure, aggiunto mistral)
    parser.add_argument('--mistral_api_key', type=str, required=False, 
                        help='Mistral AI API key (or use MISTRAL_API_KEY env var)')
    
    parser.add_argument('--debug', type=bool, default=False, 
                        help='Print debug infos (default: False)')
    
    args = vars(parser.parse_args())

    pharmacy_server = None # Rinominato
    try:
        pharmacy_server = PharmacyInteraction(**args) # Rinominato
    except KeyboardInterrupt:
        if pharmacy_server:
            pharmacy_server.shutdown()


