import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import heroImg from '../assets/hero.jpg';

const MARQUEE = ['Necklaces', 'Rings', 'Earrings', 'Bangles', 'Pendants', 'Maan Tika', 'Payal', 'Bridal Sets'];

function StyleCard({ style, onClick }) {
  return (
    <div className="style-card" onClick={onClick} role="button" tabIndex={0}>
      {style.previewUrl
        ? <img src={style.previewUrl} alt={style.name} loading="lazy" />
        : <div className="style-card__placeholder">{style.name.charAt(0)}</div>}
      <div className="style-card__label">{style.name}</div>
    </div>
  );
}

export default function Landing() {
  const [styles, setStyles] = useState([]);
  const { user } = useAuth();
  const nav = useNavigate();
  const start = () => nav(user ? '/studio' : '/register');

  useEffect(() => {
    api('/catalog/styles').then((d) => setStyles(d.styles)).catch(() => {});
  }, []);

  return (
    <div>
      <div className="demo-ribbon">Launch preview — AI output runs in demo mode until the studio connects a paid AI provider</div>
      <nav className="nav">
        <Link to="/" className="nav__brand">Jewellery<span>.photo</span></Link>
        <div className="nav__links">
          <a href="#how">Process</a>
          <a href="#styles">Styles</a>
          <a href="#pricing">Pricing</a>
          {user ? (
            <>
              {user.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
              <Link to="/studio" className="nav__cta">Studio</Link>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/register" className="nav__cta">Start creating</Link>
            </>
          )}
        </div>
      </nav>

      <header className="hero">
        <div className="hero__grid">
          <div className="hero__copy">
            <div className="eyebrow">For Indian Jewellers</div>
            <h1 className="display">One photo.<br />An entire <em>catalog.</em></h1>
            <p className="lead lead--light">
              Upload a single photograph of your piece. Our studio styles it into
              premium, catalog-grade jewellery photography — bridal, editorial, boutique and more.
            </p>
            <div className="hero__cta-row">
              <button className="btn btn--gold" onClick={start}>Start creating</button>
              <a className="btn btn--ghost" href="#styles">View styles</a>
            </div>
            <div className="hero__note">Your first photos are free · no card needed</div>
          </div>
          <div>
            <img className="hero__image" src={heroImg} alt="Gold necklace styled on dark silk" />
          </div>
        </div>
        <div className="hero__marquee">
          {[...MARQUEE, ...MARQUEE].map((m, i) => <span key={i}>{m} ·&nbsp;</span>)}
        </div>
      </header>

      <section className="section section--paper" id="how">
        <div className="section__inner">
          <div className="section__head">
            <div>
              <div className="eyebrow eyebrow--ink">The Process</div>
              <h2 className="section-title">Three steps to a finished shoot.</h2>
            </div>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step__num">01</div>
              <h3>Upload your photo</h3>
              <p>Take a plain photo of your piece with any phone. No lightbox, no studio, no photographer needed.</p>
            </div>
            <div className="step">
              <div className="step__num">02</div>
              <h3>Pick your style</h3>
              <p>Choose the jewellery type and a look — studio closeup, Indian bridal, flat lay, modern wear and more.</p>
            </div>
            <div className="step">
              <div className="step__num">03</div>
              <h3>Download &amp; sell</h3>
              <p>Receive a styled, catalog-grade image in seconds. Use it on WhatsApp catalogs, Instagram and your website.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--dark" id="styles">
        <div className="section__inner">
          <div className="section__head">
            <div>
              <div className="eyebrow">The Collection</div>
              <h2 className="section-title">Styles for every counter.</h2>
            </div>
            <button className="link-underline" style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--gold)', color: 'var(--ivory)', cursor: 'pointer' }} onClick={start}>Try them all</button>
          </div>
          <div className="style-grid">
            {styles.map((s) => <StyleCard key={s.id} style={s} onClick={start} />)}
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="section__inner">
          <div className="section__head">
            <div>
              <div className="eyebrow eyebrow--ink">Pricing</div>
              <h2 className="section-title">Simple credits. No surprises.</h2>
            </div>
            <p className="lead" style={{ maxWidth: 380 }}>One credit is one finished image. Your first credits are on us — sign up and start shooting.</p>
          </div>
          <div className="price-grid">
            <div className="price-card">
              <div className="price-card__plan">Starter</div>
              <div className="price-card__amount">Free<small> to begin</small></div>
              <ul>
                <li>Free credits on sign up</li>
                <li>Every style in the collection</li>
                <li>High-resolution downloads</li>
              </ul>
              <button className="btn btn--ghost-ink" onClick={start}>Create account</button>
            </div>
            <div className="price-card price-card--featured">
              <div className="price-card__plan">Studio</div>
              <div className="price-card__amount">Credits<small> as you grow</small></div>
              <ul>
                <li>Top up credits as you need them</li>
                <li>Priority generation</li>
                <li>Commercial usage rights</li>
              </ul>
              <button className="btn btn--gold" onClick={start}>Start creating</button>
            </div>
            <div className="price-card">
              <div className="price-card__plan">Custom</div>
              <div className="price-card__amount">Bulk<small> &amp; bespoke</small></div>
              <ul>
                <li>Full-catalog shoots for wholesalers</li>
                <li>Custom styles for your brand</li>
                <li>Dedicated support</li>
              </ul>
              <a className="btn btn--ghost-ink" href="mailto:hello@jewellery.photo">Contact us</a>
            </div>
          </div>
          <div style={{ marginTop: 26, textAlign: 'center' }}>
            <span className="badge-note">Paid plans activate when payment collection launches — credits are granted by the studio today</span>
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="section__inner">
          <div className="section__head" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <div>
              <div className="eyebrow eyebrow--ink">Questions</div>
              <h2 className="section-title">Everything jewellers ask.</h2>
            </div>
          </div>
          <div className="faq">
            <details>
              <summary>Which types of jewellery can I upload?</summary>
              <p>Necklaces, rings, earrings, bracelets and bangles, pendants, maan tika, payal and full sets. If your piece fits in a photo, the studio can style it.</p>
            </details>
            <details>
              <summary>What photo should I upload?</summary>
              <p>Any clear phone photo works — place the piece on a plain surface with decent light and keep it in focus. The studio handles backdrop, lighting and styling.</p>
            </details>
            <details>
              <summary>What are credits?</summary>
              <p>One credit produces one finished image. Credits only spend on successful results — a failed generation costs nothing.</p>
            </details>
            <details>
              <summary>Can I use the images commercially?</summary>
              <p>Yes. Finished images of your own pieces are yours to use across your catalog, social media and advertising.</p>
            </details>
            <details>
              <summary>Is my jewellery data private?</summary>
              <p>Your uploads and results are visible only to your account. We never use your designs to serve other customers.</p>
            </details>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer__grid">
          <div>
            <div className="footer__brand">Jewellery<span>.photo</span></div>
            <p className="lead lead--light" style={{ marginTop: 16, maxWidth: 380 }}>
              Turn one jewellery photo into a premium catalog — instantly.
            </p>
          </div>
          <div>
            <h4>Studio</h4>
            <a href="#how">How it works</a>
            <a href="#styles">Styles</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div>
            <h4>Get started</h4>
            <Link to="/register">Create account</Link>
            <Link to="/login">Sign in</Link>
            <a href="mailto:hello@jewellery.photo">hello@jewellery.photo</a>
          </div>
        </div>
        <div className="footer__base">
          <span>© 2026 Jewellery.photo</span>
          <span>Crafted for Indian jewellers</span>
        </div>
      </footer>
    </div>
  );
}
