import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    screen : {
        flex : 1,
        backgroundColor : "black",
        justifyContent : "center",
        alignItems : "center",
        padding : 36
    },
    container : {
        flex : 1,
        width : "100%",
        height : "100%",
        alignItems : "center",
        justifyContent : "space-evenly",
        backgroundColor : "red",
        padding : 12,
        marginTop : 32,
        marginBottom : 32,
    },
    button : {
        width : "100%",
        height : 72,
        backgroundColor : "lime",
        justifyContent : "center",
        alignItems : "center"
    },
    text : {
        fontSize : 24,
    },
})

export default styles