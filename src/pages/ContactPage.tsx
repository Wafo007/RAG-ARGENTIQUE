import { Mail, MapPin, Phone } from 'lucide-react';
import Layout from '../components/Layout';
import './ContactPage.css';

/**
 * Page de contact simple, présentée dans la barre latérale "Publications".
 * Formulaire purement front-end pour l'instant (pas encore branché à un endpoint backend).
 */
export default function ContactPage() {
  return (
    <Layout withSidebar>
      <div className="contact-page">
        <h1>Contactez le CERVARENT</h1>
        <p>Une question sur nos travaux ou nos publications ? Écrivez-nous.</p>

        <div className="contact-grid">
          <form
            className="contact-form"
            onSubmit={(e) => {
              e.preventDefault();
              alert('Merci, votre message a été noté (démo front-end).');
            }}
          >
            <label>
              Nom complet
              <input type="text" name="name" placeholder="Votre nom" required />
            </label>
            <label>
              E-mail
              <input type="email" name="email" placeholder="vous@exemple.com" required />
            </label>
            <label>
              Message
              <textarea name="message" rows={5} placeholder="Votre message" required />
            </label>
            <button type="submit">Envoyer le message</button>
          </form>

          <div className="contact-info">
            <div>
              <Mail size={18} />
              <div>
                <strong>E-mail</strong>
                <span>contact@cervarent.org</span>
              </div>
            </div>
            <div>
              <Phone size={18} />
              <div>
                <strong>Téléphone</strong>
                <span>+237 6 00 00 00 00</span>
              </div>
            </div>
            <div>
              <MapPin size={18} />
              <div>
                <strong>Adresse</strong>
                <span>Bamenda, Région du Nord-Ouest, Cameroun</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
