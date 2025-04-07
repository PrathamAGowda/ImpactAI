import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    screen : {
        flex : 1,
        backgroundColor : "black",
        justifyContent : "center",
        alignItems : "center",
        padding : 16
    },
    container : {
        flex : 1,
        width : "100%",
        height : "100%",
        alignItems : "center",
        justifyContent : "space-evenly",
        padding : 12,
        marginTop : 16,
        marginBottom : 16,
        borderRadius : 16
    },
    button : {
        width : 256,
        height : 256,
        backgroundColor : "lime",
        justifyContent : "center",
        alignItems : "center",
        borderRadius : "100%"
    },
    textContainer : {
        
    },
    text : {
        fontSize : 24,
    },
    statsText : {
        color : "white",
        fontSize : 24
    },
})

export default styles