import ThemeToggle, {MotionToggle} from '../../ui/ThemeToggle';

// Configurações do jogador neste navegador (tema e animações). Nada aqui vai ao servidor: as escolhas ficam no localStorage.
export default function SettingsPanel(){
  return <section className="panel settings-panel"><div className="section-title"><h2>Configurações</h2><span>Só neste navegador</span></div>
    <p className="muted">Essas escolhas ficam guardadas neste aparelho. Em outro computador ou celular, escolha de novo.</p>
    <div className="setting-row settings-option"><div><strong>Tema</strong><small>Escuro é o padrão. O claro tem o tom de pergaminho do jogo original.</small></div><ThemeToggle/></div>
    <div className="setting-row settings-option"><div><strong>Animações</strong><small>Desligadas: nada se mexe na tela. Some o fogo dos itens +10, o brilho das classes, a rolagem suave e as transições. Indicado para quem sente tontura ou enjoo com movimento. Sem escolha, o jogo segue a opção "Reduzir movimento" do seu sistema.</small></div><MotionToggle/></div>
  </section>;
}
