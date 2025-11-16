class PepperFeedback {
    constructor(className, imgFolderPath) {
        this.className = className;
        this.imgFolderPath = imgFolderPath;
    }

    _getElements() {
        return document.querySelectorAll(`img.${this.className}`);
    }

    _doAction(callback) {
        let elements = this._getElements();
        for (var i = 0; i < elements.length; i++) {
            // Perform actions on each element
            callback(elements[i]);
        }
    }

    _setImgSrc(element, src) {
        element.src = this.imgFolderPath + src;
    }

    default() {
        this._doAction((element)=>this._setImgSrc(element, "logo.png"));
    }
    hear() {
        this._doAction((element)=>this._setImgSrc(element, "hear.jpg"));
    }
    no_hear() {
        this._doAction((element)=>this._setImgSrc(element, "did_not_hear.jpg"));
    }
    speak() {
        this._doAction((element)=>this._setImgSrc(element, "speak.png"));
    }
    scan() {
        this._doAction((element)=>this._setImgSrc(element, "scan.png"));
    }


    invisible() {
        this._doAction((element)=>element.style.visibility = "hidden");
    }
    visible() {
        this._doAction((element)=>element.style.visibility = "visible");
    }

}
