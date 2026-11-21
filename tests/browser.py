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
    for width in (375, 1280):
        page = browser.new_page(viewport={"width": width, "height": 850}, accept_downloads=True)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"http://127.0.0.1:{server.server_port}/")
        page.locator("#demo").click()
        expect(page.locator("#metrics")).to_contain_text("R$ 1,50")
        page.locator("#orders").set_input_files(root / "exemplos/pedidos-lote.csv")
        page.locator("#payments").set_input_files(root / "exemplos/repasses-lote.csv")
        page.get_by_text("Preparar prévia", exact=True).click()
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
