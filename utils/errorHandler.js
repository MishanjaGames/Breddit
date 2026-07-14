module.exports = (res, codeError,  error) => {
    res.status(codeError).json({
        success: false,
        message: error.message ? error.message : error
    })
}