import './center-screen-loader.scss';
import { CircularProgress } from "@mui/material";

export default function CenterScreenLoader() {
    return (
        <div className="center-screen-loader-container">
            <CircularProgress thickness={1.5} size={200} color="info"/>
        </div>
    );
}
