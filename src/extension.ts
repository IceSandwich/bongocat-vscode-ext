import * as vscode from 'vscode';
import * as path from 'path';

function getWebviewOptions(extensionPath: string): vscode.WebviewOptions & vscode.WebviewPanelOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,
		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
	};
}

class BongCatWebviewProvider {
	public static readonly viewType = 'vscode-bongocat.view';
	private _extensionPath: string;
	private _webviewView?: vscode.WebviewView;
	private _callback : Function;

	constructor(extensionUri : string, callback : Function) {
		this._extensionPath = extensionUri;
		this._callback = callback;
	}

	resolveWebviewView = (webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken) => {
		this._webviewView = webviewView;
		
		webviewView.webview.options = getWebviewOptions(this._extensionPath);
		webviewView.webview.html = getWebViewContentWithResources(this._extensionPath, this._webviewView.webview);

		this._callback();
	}

	getWebView() {
		return this._webviewView;
	}
}

export function activate({ subscriptions, extensionUri, extensionPath }: vscode.ExtensionContext) {
	// vscode.commands.executeCommand('vscode-bongocat.view.focus');
	let typeCommand = vscode.commands.registerCommand('type', (args) => {
		// console.log("typein", args.text, "code", args.text.charCodeAt());
		let state = BongoState.RIGHT;
		let charCode : number = args.text.charCodeAt();
		if ((charCode >= 104 && charCode <= 112) || charCode == 117 || charCode == 121 || (charCode >= 123 && charCode <= 125)) { // h~p || u || y || '{|}'
			state = BongoState.LEFT;
		}
		if ((charCode >= 72 && charCode <= 80) || charCode == 85 || charCode == 89 || (charCode >= 91 && charCode <= 95)) { // h~p || u || y || '{|}'
			state = BongoState.LEFT;
		}
		if ((charCode >= 54 && charCode <= 63) || (charCode >= 38 && charCode <= 47)) { // 6-? || &~/
			state = BongoState.LEFT;
		}
		webviewViewProvider.getWebView()!.webview.postMessage(state); //bongoFrameGenerator.next().value);
		return vscode.commands.executeCommand('default:type', args);
	});
	
	let webviewViewProvider: BongCatWebviewProvider = new BongCatWebviewProvider(extensionPath, () => {
		webviewViewProvider.getWebView()!.onDidDispose(
			() => {
				typeCommand.dispose();
			},
			null,
			subscriptions
		);
	});
	subscriptions.push(vscode.window.registerWebviewViewProvider(BongCatWebviewProvider.viewType, webviewViewProvider));
}

function getWebviewContent(bongoLeftUri: vscode.Uri, bongoRightUri: vscode.Uri, bongoMiddleUri: vscode.Uri) {

	return `
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Bongo Cat</title>
		</head>
		<body>
			<img id="bongo-middle" src=${bongoMiddleUri} width="100%"/>
			<img id="bongo-left" src=${bongoLeftUri} width="100%" hidden/>
			<img id="bongo-right" src=${bongoRightUri} width="100%" hidden/>
		</body>
		<script>
			const bongoLeft = document.getElementById('bongo-left');
			const bongoRight= document.getElementById('bongo-right');
			const bongoMiddle= document.getElementById('bongo-middle');
			let timeout;

			window.addEventListener('message', event => {
				const message = event.data;
				clearTimeout(timeout);
				if(message == 'left'){
					bongoMiddle.hidden = true;
					bongoLeft.hidden = false;
					bongoRight.hidden = true;
				}else{
					bongoMiddle.hidden = true;
					bongoLeft.hidden = true;
					bongoRight.hidden = false;
				}
				timeout = setTimeout(() => {bongoLeft.hidden = true; bongoRight.hidden = true; bongoMiddle.hidden = false; }, 200);
			});
		</script>
	</html>`;
}

function getWebViewContentWithResources(extensionPath : string, webview : vscode.Webview) {
	// get its frame paths
	const bongoRightPath = vscode.Uri.file(path.join(extensionPath, 'media', 'bongo_right.png'));
	const bongoRightUri = webview.asWebviewUri(bongoRightPath);
	const bongoLeftPath = vscode.Uri.file(path.join(extensionPath, 'media', 'bongo_left.png'));
	const bongoLeftUri = webview.asWebviewUri(bongoLeftPath);
	const bongoMiddlePath = vscode.Uri.file(path.join(extensionPath, 'media', 'bongo_middle.png'));
	const bongoMiddleUri = webview.asWebviewUri(bongoMiddlePath);

	return getWebviewContent(bongoLeftUri, bongoRightUri, bongoMiddleUri);
}

enum BongoState {
	LEFT = 'left',
	RIGHT = 'right'
}

// this method is called when your extension is deactivated
export function deactivate() { }
