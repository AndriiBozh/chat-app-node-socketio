const renderErrorMessage = (reason) => {
  return `
            <body style="margin: 0 auto; padding: 0 auto;">
                <div style="
                        background: antiquewhite; 
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                        justify-content: center; 
                        height: 100vh; 
                        width: 100vw;
                        font-size: 5rem;">
                    <p> ${reason} </p>
                    <p> ¯\\_(ツ)_/¯</p>
                    <p>
                        <a href='/'>login</a>
                    </p>        
                </div>
            </body>`;
};

module.exports = renderErrorMessage;
