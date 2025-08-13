
export const chat = (req, res) => {
    try {
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Something went wrong, Please try again'})
    }
}