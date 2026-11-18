package br.com.gojulls;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Imprime um HTML pelo sistema de impressão do Android, que tem a opção "Salvar como PDF".
 * Usado para gerar as listas, provas e pacotes de estudo do Go, Julls!
 */
@CapacitorPlugin(name = "GoPrint")
public class PrintPlugin extends Plugin {
    // referência mantida até o fim da impressão (evita o WebView ser coletado no meio)
    private WebView printView;

    @PluginMethod
    public void print(PluginCall call) {
        final String html = call.getString("html");
        final String name = call.getString("name", "Go Julls");
        if (html == null) {
            call.reject("html vazio");
            return;
        }
        getActivity().runOnUiThread(() -> {
            WebView view = new WebView(getActivity());
            view.getSettings().setJavaScriptEnabled(false);
            view.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView v, String url) {
                    PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                    PrintDocumentAdapter adapter = v.createPrintDocumentAdapter(name);
                    PrintAttributes attrs = new PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                        .build();
                    pm.print(name, adapter, attrs);
                    call.resolve();
                }
            });
            view.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null);
            printView = view;
        });
    }
}
