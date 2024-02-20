const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch((error)=>{
            return (next(error))
            
        } )
        
    }
}



export {asyncHandler}
















// const asynHandler = (apiHandler)=>{
//    return async(req, res , next)=>{
//     try {
//         await apiHandler(req, res, next)
        
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             messege: error.messege
//         })
//     }
//    }
// }