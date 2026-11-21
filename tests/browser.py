"""Exercise the page without sending an extrato to an external service."""
import os
import shutil
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread

from playwright.sync_api import expect, sync_playwright

root = Path(__file__).resolve().parents[1]
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=root))
Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p, TemporaryDirectory() as tmp:
    backend = os.environ.get("ENGINE", "chromium")
    browser = getattr(p, backend).launch(executable_path=shutil.which("google-chrome") if backend == "chromium" else None)
    for width in (320, 375, 1280):
        page = browser.new_page(viewport={"width": width, "height": 850}, accept_downloads=True)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"http://127.0.0.1:{server.server_port}/")
        page.keyboard.press("Tab")
        expect(page.locator(".skip")).to_be_focused()
        page.keyboard.press("Enter")
        assert page.evaluate("location.hash === document.querySelector('.skip').hash")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        page.locator("#demo").click()
        expect(page.locator("#metrics")).to_contain_text("R$ 1,50")
        if os.environ.get("CAPTURAR_DEMO") == "1":
            captures = root / "capturas"
            captures.mkdir(exist_ok=True)
            page.screenshot(path=captures / f"demo-{width}.png", animations="disabled")

        expect(page.locator("#segments")).to_contain_text("Delivery")
        page.locator("#segment-by").select_option("shop")
        expect(page.locator("#segments")).to_contain_text("Loja exemplo")
        with page.expect_download() as summary_file:
            page.locator("#segment-csv").click()
        summary_csv = Path(summary_file.value.path()).read_text(encoding="utf-8-sig")
        assert '"Loja"' in summary_csv and "Loja exemplo" in summary_csv
        page.locator("#status").select_option("Pendente")
        expect(page.locator("#segments tr td").nth(1)).to_have_text("—")
        expect(page.locator("#metrics strong").first).to_have_text("—")
        page.evaluate("window.print = () => {}")
        page.locator("#print").click()
        assert page.locator("#printout dd").nth(2).text_content() == "—"
        assert "Loja exemplo" in page.locator("#printout tbody").text_content()
        page.locator("#status").select_option("")
        page.evaluate("window.print = () => {}")
        page.locator("#print").click()
        assert "Sem comparação conclusiva" in page.locator("#printout").text_content()
        assert "1,50" in page.locator("#printout dl").text_content()
        page.locator("#direction").select_option("short")
        page.locator("#minimum").fill("1,50")
        expect(page.locator("#results tr")).to_have_count(1)
        page.locator("#minimum").fill("1,51")
        expect(page.locator("#results tr")).to_have_count(0)
        expect(page.locator("#count")).to_contain_text("Nenhum pedido")
        page.locator("#reset-filters").click()
        expect(page.locator("#query")).to_be_focused()
        page.locator("#order-results").select_option("difference")
        expect(page.locator("#results tr").first).to_contain_text("1,50")
        page.locator("#reset-filters").click()
        page.locator("#minimum").fill("")
        page.locator("#direction").select_option("")
        page.locator("#entry-type").select_option("comissao")
        expect(page.locator("#results")).to_contain_text("Lote L01")
        expect(page.locator("#results tr")).to_have_count(1)
        page.locator("#entry-type").select_option("")
        page.locator("#orders").set_input_files(root / "exemplos/pedidos-lote.csv")
        page.locator("#payments").set_input_files(root / "exemplos/repasses-lote.csv")
        page.get_by_text("Preparar prévia", exact=True).click()
        panel = page.locator("#maps article").first
        panel.get_by_text("Guardar mapeamento neste navegador",exact=True).click()
        panel.get_by_text("Aplicar mapeamento guardado",exact=True).click()
        expect(page.locator("#message")).to_contain_text("Mapeamento aplicado")
        page.locator("#confirm").click()
        expect(page.locator("#origin")).to_have_text("2 arquivo(s) nesta sessão")
        page.get_by_text("Preparar prévia", exact=True).click()
        page.locator("#confirm").click()
        expect(page.locator("#message")).to_contain_text("já estão")
        page.locator("#cancel").click()
        page.locator("#status").select_option("Divergente")
        page.get_by_role("button", name="Pedido 0019").click()
        page.get_by_label("Motivo da revisão").fill("Aguardando o extrato seguinte")
        page.get_by_text("Registrar revisão", exact=True).click()
        expect(page.locator("#results")).to_contain_text("revisado")
        page.locator("#status").select_option("Revisado")
        expect(page.locator("#count")).to_contain_text("1 grupo")
        with page.expect_download() as export:
            page.locator("#export").click()
        csv = Path(tmp, "evidencia.csv")
        export.value.save_as(csv)
        assert "Aguardando o extrato seguinte" in csv.read_text(encoding="utf-8")
        assert "L01" not in csv.read_text(encoding="utf-8")
        with page.expect_download() as backup:
            page.locator("#save").click()
        file = Path(tmp, "sessao.json")
        backup.value.save_as(file)
        page.reload()
        page.get_by_text("Restaurar um fechamento", exact=True).click()
        page.locator("#restore").set_input_files(file)
        expect(page.locator("#message")).to_have_text("Backup restaurado.")
        expect(page.locator("#results")).to_contain_text("revisado")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        page.locator("#orders").set_input_files({"name":"erro.csv","mimeType":"text/csv","buffer":b"pedido;valor\nx;invalido"})
        page.get_by_text("Preparar prévia", exact=True).click()
        page.locator("#confirm").click()
        expect(page.locator("#message")).to_contain_text("linha 2")
        expect(page.locator("#results")).to_contain_text("Lote L01")
        assert not errors, errors
        page.close()
    browser.close()
server.shutdown()
server.server_close()
