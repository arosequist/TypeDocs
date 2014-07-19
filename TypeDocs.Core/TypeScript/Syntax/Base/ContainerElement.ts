﻿module TypeDocs.Syntax {
    /**
     * Defines the attributes common to all syntax elements.
     */
    export class ContainerElement extends Element {
        /**
         * The children of the current element.
         */
        public items: Element[] = [];
    }
}